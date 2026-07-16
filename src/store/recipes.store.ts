import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Recipe, RecipeIngredient, RecipeVariation } from "@/types";
import { RECIPES } from "@/mock/recipes";
import { USE_API, apiErrorHandler } from "@/services/http";
import { recipesService } from "@/services/recipes.service";
import { useMenuStore } from "./menu.store";
import { menuService } from "@/services/menu.service";

interface RecipesState {
  recipes: Recipe[];
  load: () => Promise<void>;
  create: (recipe: Recipe) => void;
  update: (recipe: Recipe) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
}

export const useRecipesStore = create<RecipesState>()(
  persist(
  (set, get) => ({
  recipes: USE_API ? [] : structuredClone(RECIPES),

  load: async () => {
    if (!USE_API) return;
    try {
      const recipes = await recipesService.list();
      set({ recipes });
    } catch { /* keep persisted state */ }
  },

  create: (recipe) => {
    set((s) => ({ recipes: [recipe, ...s.recipes] }));
    if (USE_API) recipesService.create(recipe).then((saved) =>
      set((s) => ({ recipes: s.recipes.map((r) => (r.id === recipe.id ? saved : r)) }))
    ).catch(apiErrorHandler("receta"));
  },

  update: (recipe) => {
    set((s) => ({
      recipes: s.recipes.map((r) => (r.id === recipe.id ? { ...recipe, updatedAt: "Justo ahora" } : r)),
    }));
    if (USE_API) recipesService.update(recipe).catch(apiErrorHandler("receta"));
  },

  remove: (id) => {
    const recipe = get().recipes.find((r) => r.id === id);
    set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) }));
    if (USE_API) recipesService.remove(id).catch(apiErrorHandler("eliminar receta"));
    // Cascada: la ficha técnica y el producto son la misma entidad conceptual.
    if (recipe?.productId) {
      const pid = recipe.productId;
      useMenuStore.setState((s) => ({ products: s.products.filter((p) => String(p.id) !== String(pid)) }));
      if (USE_API) menuService.deleteProduct(String(pid)).catch(apiErrorHandler("eliminar producto"));
    }
  },

  duplicate: (id) =>
    set((s) => {
      const original = s.recipes.find((r) => r.id === id);
      if (!original) return s;
      const copy: Recipe = {
        ...structuredClone(original),
        id: uid("r"),
        name: `${original.name} (copia)`,
        status: "draft",
        productId: undefined,
        updatedAt: "Justo ahora",
      };
      if (USE_API) recipesService.create(copy).catch(apiErrorHandler("duplicar receta"));
      const idx = s.recipes.findIndex((r) => r.id === id);
      const next = [...s.recipes];
      next.splice(idx + 1, 0, copy);
      return { recipes: next };
    }),
}),
  {
    name: "axis-recipes",
    partialize: (s) => ({ recipes: s.recipes }),
  },
));

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyIngredient(): RecipeIngredient {
  return { id: uid("ing"), inventoryId: "", name: "", unit: "", quantity: 1, waste: 0 };
}

export function emptyVariation(): RecipeVariation {
  return { id: uid("var"), name: "", priceDelta: 0, extraIngredients: [] };
}

export function emptyRecipe(): Recipe {
  return {
    id: uid("r"),
    name: "",
    emoji: "🍽️",
    description: "",
    category: "hamburguesas",
    productId: undefined,
    status: "draft",
    station: "grill",
    difficulty: "easy",
    portions: 1,
    prepMinutes: 10,
    price: 0,
    ingredients: [],
    variations: [],
    steps: [],
    allergens: [],
    allergensOther: "",
    tags: [],
    updatedAt: "Justo ahora",
  };
}
