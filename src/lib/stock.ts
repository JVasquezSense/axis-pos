import type { InventoryItem, OrderLine, Product, Recipe } from "@/types";
import { consumptionInItemUnit } from "./recipes";

/**
 * Cuántas unidades de un producto alcanzan con el inventario que hay.
 *
 * Replica la misma regla con la que el backend descuenta al vender
 * (`consume_recipe_demand`): el combo se abre en sus componentes, el simple
 * descuenta el insumo que ES, y el compuesto los de su ficha técnica. Si las
 * dos no coinciden, el POS deja pedir algo que la cocina no puede preparar.
 *
 * Regla de oro: ante la duda NO se limita. Un insumo que no aparece, una ficha
 * sin ingredientes o el inventario todavía sin cargar devuelven "sin límite":
 * es preferible dejar pasar un pedido a bloquear la venta de un restaurante
 * entero por un dato que falta.
 */
export interface StockContext {
  items: InventoryItem[];
  recipes: Recipe[];
  products: Product[];
}

/** Margen para que 0.30000000000000004 no cuente como "no alcanza". */
const EPS = 1e-9;

function findItem(ctx: StockContext, id: string | number | null | undefined) {
  if (id == null || id === "") return undefined;
  return ctx.items.find((i) => String(i.id) === String(id));
}

/**
 * Qué insumo descuenta una variación de un producto simple.
 *  - undefined → usa el insumo estándar del producto
 *  - null      → esta variación no descuenta nada
 */
function variationSupply(
  product: Product,
  variationId: string
): { id: string; qty: number } | null | undefined {
  const v = (product.variations ?? []).find((x) => String(x.id) === String(variationId));
  if (!v) return undefined;
  if (v.useDefaultSupply !== false) return undefined;
  if (v.inventoryId == null || v.inventoryId === "") return null;
  return { id: String(v.inventoryId), qty: Number(v.inventoryQty) || 1 };
}

/**
 * Insumos que consume UNA unidad del producto, ya en la unidad del insumo.
 * Un mapa vacío significa que no descuenta nada (y por tanto no se limita).
 */
export function unitDemand(
  product: Product,
  ctx: StockContext,
  variationId?: string
): Map<string, number> {
  const out = new Map<string, number>();
  const bump = (id: string, qty: number) => {
    if (qty > 0) out.set(id, (out.get(id) ?? 0) + qty);
  };

  // `seen` corta un combo que se contenga a sí mismo: sin esto la expansión
  // se cicla y cuelga la caja.
  const add = (p: Product, mult: number, seen: Set<string>) => {
    if (seen.has(String(p.id))) return;

    if (p.isCombo && p.comboItems?.length) {
      const nested = new Set(seen).add(String(p.id));
      p.comboItems.forEach((ci) => {
        const comp = ctx.products.find((x) => String(x.id) === String(ci.productId));
        if (comp) add(comp, mult * (Number(ci.quantity) || 1), nested);
      });
      return;
    }

    if (p.kind === "simple") {
      const override = variationId ? variationSupply(p, variationId) : undefined;
      if (override === null) return; // la variación no descuenta nada
      const id = override ? override.id : p.inventoryId;
      const qty = override ? override.qty : Number(p.inventoryQty) || 1;
      if (id != null && id !== "") bump(String(id), qty * mult);
      return;
    }

    // Compuesto (o sin `kind` definido): sale de la ficha técnica, igual que
    // en el backend, que busca receta para todo lo que no es simple.
    const recipe = ctx.recipes.find((r) => String(r.productId) === String(p.id));
    if (!recipe) return;
    const portions = Math.max(recipe.portions, 1);
    recipe.ingredients.forEach((ing) => {
      const item = findItem(ctx, ing.inventoryId);
      if (!item) return;
      bump(String(ing.inventoryId), (consumptionInItemUnit(ing, item) / portions) * mult);
    });
  };

  add(product, 1, new Set());
  return out;
}

/** Insumos que el carrito ya tiene comprometidos. */
export function cartDemand(lines: OrderLine[], ctx: StockContext): Map<string, number> {
  const total = new Map<string, number>();
  lines.forEach((l) => {
    unitDemand(l.product, ctx, l.variationId).forEach((qty, id) => {
      total.set(id, (total.get(id) ?? 0) + qty * l.quantity);
    });
  });
  return total;
}

/**
 * Unidades que todavía se pueden agregar al carrito, ya descontando lo que el
 * propio carrito reserva. `Infinity` = sin límite conocido (ver regla de oro).
 *
 * `ignoreLineId` deja fuera una línea del cálculo: al preguntar "¿puedo subir
 * esta línea a N?" su propia reserva no debe contar como ajena.
 */
export function remainingUnits(
  product: Product,
  lines: OrderLine[],
  ctx: StockContext,
  variationId?: string,
  ignoreLineId?: string
): number {
  // Inventario sin cargar: no hay nada contra qué comparar.
  if (ctx.items.length === 0) return Infinity;

  const per = unitDemand(product, ctx, variationId);
  if (per.size === 0) return Infinity; // no descuenta inventario

  const reserved = cartDemand(
    ignoreLineId ? lines.filter((l) => l.id !== ignoreLineId) : lines,
    ctx
  );

  let min = Infinity;
  for (const [id, qty] of per) {
    const item = findItem(ctx, id);
    if (!item) return Infinity; // insumo desconocido: no se limita
    const free = Number(item.stock) - (reserved.get(id) ?? 0);
    min = Math.min(min, Math.floor(free / qty + EPS));
  }
  return Math.max(min, 0);
}
