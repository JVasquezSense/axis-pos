import type {
  Recipe,
  RecipeIngredient,
  RecipeCost,
  RecipeStation,
  RecipeStatus,
  RecipeDifficulty,
  Allergen,
  InventoryItem,
} from "@/types";
import { INVENTORY } from "@/mock/datasets";

/** Food cost objetivo para sugerir precio de venta (30%). */
export const TARGET_FOOD_COST = 0.3;

const INV_MAP = new Map(INVENTORY.map((i) => [i.id, i]));

export function getInventoryItem(id: string): InventoryItem | undefined {
  return INV_MAP.get(id);
}

/**
 * Factor de conversión entre unidades compatibles.
 * Retorna cuántas `toUnit` equivalen a 1 `fromUnit`.
 * Ejemplo: unitFactor("g","kg") = 0.001  →  200g × 0.001 = 0.2kg
 */
function unitFactor(fromUnit: string, toUnit: string): number {
  const fu = fromUnit.toLowerCase();
  const tu = toUnit.toLowerCase();
  if (fu === tu) return 1;

  // Masa: base gramo
  const MASS: Record<string, number> = { g: 1, gr: 1, kg: 1000, lb: 453.592, oz: 28.3495 };
  // Volumen: base mililitro
  const VOL: Record<string, number> = { ml: 1, cl: 10, l: 1000, lt: 1000 };

  if (MASS[fu] != null && MASS[tu] != null) return MASS[fu] / MASS[tu];
  if (VOL[fu] != null && VOL[tu] != null) return VOL[fu] / VOL[tu];
  return 1; // unidades de conteo o incompatibles — sin conversión
}

/** Cantidad efectiva considerando la merma. */
export function effectiveQty(ing: RecipeIngredient): number {
  return ing.quantity / Math.max(1 - ing.waste, 0.01);
}

/** Costo de un insumo dentro de la receta con conversión de unidades correcta. */
export function ingredientCost(ing: RecipeIngredient, item: InventoryItem): number {
  // Convierte la cantidad de la receta (ing.unit) a la unidad del insumo (item.unit)
  // para multiplicar por el costo unitario del inventario.
  const factor = unitFactor(ing.unit, item.unit);
  return effectiveQty(ing) * factor * item.cost;
}

/**
 * Motor de costeo: costo, food cost %, margen, precio sugerido y disponibilidad.
 * @param liveItems  Insumos del store en tiempo real (incluye items creados dinámicamente).
 *                   Se fusionan con los mock; el store tiene prioridad.
 */
export function computeRecipeCost(recipe: Recipe, liveItems?: InventoryItem[]): RecipeCost {
  // Mapa fusionado: mock base + items vivos (store tiene prioridad)
  const lookup: (id: string) => InventoryItem | undefined = liveItems?.length
    ? (id) => liveItems.find((i) => String(i.id) === String(id)) ?? INV_MAP.get(id)
    : (id) => INV_MAP.get(id);

  const portions = Math.max(recipe.portions, 1);
  const totalCost = recipe.ingredients.reduce((s, ing) => {
    const item = lookup(ing.inventoryId);
    return s + (item ? ingredientCost(ing, item) : 0);
  }, 0);
  const costPerPortion = totalCost / portions;
  const price = recipe.price || 1;
  const foodCostPct = costPerPortion / price;
  const margin = price - costPerPortion;
  const marginPct = margin / price;
  const suggestedPrice = Math.round(costPerPortion / TARGET_FOOD_COST);

  // Disponibilidad: porciones preparables con stock actual (respeta unidades)
  let maxPortions = Infinity;
  for (const ing of recipe.ingredients) {
    const item = lookup(ing.inventoryId);
    if (!item) continue;
    const perPortion = effectiveQty(ing) / portions; // en ing.unit
    if (perPortion <= 0) continue;
    // Convierte a item.unit para comparar con item.stock
    const perPortionInItemUnit = perPortion * unitFactor(ing.unit, item.unit);
    maxPortions = Math.min(maxPortions, Math.floor(item.stock / perPortionInItemUnit));
  }
  if (!isFinite(maxPortions)) maxPortions = 0;

  return { totalCost, costPerPortion, foodCostPct, margin, marginPct, suggestedPrice, maxPortions };
}

/** Costo total de una variación = base + insumos extra. */
export function variationCost(recipe: Recipe, variationId: string, liveItems?: InventoryItem[]): number {
  const lookup: (id: string) => InventoryItem | undefined = liveItems?.length
    ? (id) => liveItems.find((i) => String(i.id) === String(id)) ?? INV_MAP.get(id)
    : (id) => INV_MAP.get(id);
  const base = computeRecipeCost(recipe, liveItems).costPerPortion;
  const variation = recipe.variations.find((v) => v.id === variationId);
  if (!variation) return base;
  const extra = variation.extraIngredients.reduce((s, ing) => {
    const item = lookup(ing.inventoryId);
    return s + (item ? ingredientCost(ing, item) : 0);
  }, 0);
  return base + extra / Math.max(recipe.portions, 1);
}

// ---------------------------------------------------------------------------
// Configuración visual
// ---------------------------------------------------------------------------
export const STATION: Record<RecipeStation, { label: string; emoji: string; icon: string; className: string }> = {
  grill: { label: "Parrilla", emoji: "🔥", icon: "Flame", className: "bg-orange-500/12 text-orange-600 dark:text-orange-400" },
  fry: { label: "Freidora", emoji: "🍟", icon: "CookingPot", className: "bg-amber-500/12 text-amber-600 dark:text-amber-400" },
  cold: { label: "Fríos", emoji: "🥗", icon: "Snowflake", className: "bg-sky-500/12 text-sky-600 dark:text-sky-400" },
  bar: { label: "Barra", emoji: "🍹", icon: "Wine", className: "bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-400" },
  pastry: { label: "Pastelería", emoji: "🍰", icon: "CakeSlice", className: "bg-rose-500/12 text-rose-600 dark:text-rose-400" },
};

export const RECIPE_STATUS: Record<RecipeStatus, { label: string; variant: "success" | "secondary" | "warning" }> = {
  active: { label: "Activa", variant: "success" },
  draft: { label: "Borrador", variant: "warning" },
  archived: { label: "Archivada", variant: "secondary" },
};

export const DIFFICULTY: Record<RecipeDifficulty, { label: string; className: string }> = {
  easy: { label: "Fácil", className: "text-emerald-500" },
  medium: { label: "Media", className: "text-amber-500" },
  hard: { label: "Difícil", className: "text-rose-500" },
};

export const ALLERGENS: Record<Allergen, { label: string; emoji: string }> = {
  gluten: { label: "Gluten", emoji: "🌾" },
  lacteos: { label: "Lácteos", emoji: "🥛" },
  huevo: { label: "Huevo", emoji: "🥚" },
  mani: { label: "Maní", emoji: "🥜" },
  mariscos: { label: "Mariscos", emoji: "🦐" },
  soya: { label: "Soya", emoji: "🫛" },
  pescado: { label: "Pescado", emoji: "🐟" },
};

/** Color del food cost: verde sano, ámbar ajustado, rojo alto. */
export function foodCostTone(pct: number): string {
  if (pct <= 0.3) return "text-emerald-500";
  if (pct <= 0.4) return "text-amber-500";
  return "text-destructive";
}
