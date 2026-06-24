import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Recipe, RecipeIngredient, RecipeVariation } from "@/types";
import { RECIPES } from "@/mock/recipes";
import { USE_API } from "@/services/http";
import { recipesService } from "@/services/recipes.service";

interface RecipesState {
  recipes: Recipe[];
  create: (recipe: Recipe) => void;
  update: (recipe: Recipe) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
}

export const useRecipesStore = create<RecipesState>()(
  persist(
    (set) => ({
      recipes: USE_API ? [] : structuredClone(RECIPES),

      create: (recipe) => {
        set((s) => ({ recipes: [recipe, ...s.recipes] }));
        if (USE_API) recipesService.create(recipe).then((saved) =>
          set((s) => ({ recipes: s.recipes.map((r) => (r.id === recipe.id ? saved : r)) }))
        ).catch(console.error);
      },

      update: (recipe) => {
        set((s) => ({
          recipes: s.recipes.map((r) => (r.id === recipe.id ? { ...recipe, updatedAt: "Justo ahora" } : r)),
        }));
        if (USE_API) recipesService.update(recipe).catch(console.error);
      },

      remove: (id) => {
        set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) }));
        if (USE_API) recipesService.remove(id).catch(console.error);
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
            updatedAt: "Justo ahora",
          };
          if (USE_API) recipesService.create(copy).catch(console.error);
          const idx = s.recipes.findIndex((r) => r.id === id);
          const next = [...s.recipes];
          next.splice(idx + 1, 0, copy);
          return { recipes: next };
        }),
    }),
    { name: "axis-recipes", version: 2, partialize: (s) => ({ recipes: s.recipes }) }
  )
);

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
