import { create } from "zustand";
import type { Category, Product } from "@/types";
import { CATEGORIES, PRODUCTS } from "@/mock/menu";
import { USE_API, apiErrorHandler } from "@/services/http";
import { menuService } from "@/services/menu.service";
import { useRecipesStore } from "./recipes.store";
import { recipesService } from "@/services/recipes.service";

interface MenuState {
  categories: Category[];
  products: Product[];
  load: () => Promise<void>;
  addCategory: (c: Category) => void;
  removeCategory: (id: string) => void;
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  syncRecipePrice: (productId: string, price: number) => void;
  removeProduct: (id: string) => void;
  setAvailable: (id: string, available: boolean) => void;
}

export const useMenuStore = create<MenuState>()((set, get) => ({
  categories: USE_API ? [] : structuredClone(CATEGORIES),
  products: USE_API ? [] : structuredClone(PRODUCTS),

  load: async () => {
    if (!USE_API) return;
    const [categories, products] = await Promise.all([
      menuService.getCategories(),
      menuService.getProducts(),
    ]);
    set({ categories, products });
  },

  addCategory: (c) => {
    set((s) => ({ categories: [...s.categories, c] }));
    if (USE_API) menuService.createCategory(c).then((saved) =>
      set((s) => ({ categories: s.categories.map((x) => (x.id === c.id ? saved : x)) }))
    ).catch(apiErrorHandler("categoría"));
  },

  removeCategory: (id) => {
    const removedProducts = get().products.filter((p) => p.category === id);
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      products: s.products.filter((p) => p.category !== id),
    }));
    if (USE_API) menuService.deleteCategory(id).catch(apiErrorHandler("eliminar categoría"));
    // Cascada: elimina las fichas técnicas de los productos que se van con la categoría.
    removedProducts.forEach((p) => {
      const recipe = useRecipesStore.getState().recipes.find((r) => String(r.productId) === String(p.id));
      if (!recipe) return;
      useRecipesStore.setState((s) => ({ recipes: s.recipes.filter((r) => r.id !== recipe.id) }));
      if (USE_API) recipesService.remove(recipe.id).catch(apiErrorHandler("eliminar receta"));
    });
  },

  addProduct: (p) => {
    set((s) => ({ products: [p, ...s.products] }));
    if (USE_API) menuService.createProduct(p).then((saved) =>
      set((s) => ({ products: s.products.map((x) => (x.id === p.id ? saved : x)) }))
    ).catch(apiErrorHandler("producto"));
  },

  updateProduct: (p) => {
    set((s) => ({ products: s.products.map((x) => (x.id === p.id ? p : x)) }));
    if (USE_API) menuService.updateProduct(p).catch(apiErrorHandler("producto"));
  },

  /** Sincroniza el precio hacia la ficha técnica vinculada (si existe).
   * Vive fuera de updateProduct para no disparase también cuando quien
   * llama a updateProduct es el propio recipe-editor (que ya maneja su
   * lado de la sincronización) — evita dos PATCH /recipes/ en carrera. */
  syncRecipePrice: (productId, price) => {
    const recipe = useRecipesStore.getState().recipes.find((r) => String(r.productId) === String(productId));
    if (recipe && recipe.price !== price) {
      useRecipesStore.setState((s) => ({
        recipes: s.recipes.map((r) => (r.id === recipe.id ? { ...r, price, updatedAt: "Justo ahora" } : r)),
      }));
      if (USE_API) recipesService.update({ ...recipe, price }).catch(apiErrorHandler("receta"));
    }
  },

  removeProduct: (id) => {
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
    if (USE_API) menuService.deleteProduct(id).catch(apiErrorHandler("eliminar producto"));
    // Cascada: el producto y su ficha técnica son la misma entidad conceptual.
    const recipe = useRecipesStore.getState().recipes.find((r) => String(r.productId) === String(id));
    if (recipe) {
      useRecipesStore.setState((s) => ({ recipes: s.recipes.filter((r) => r.id !== recipe.id) }));
      if (USE_API) recipesService.remove(recipe.id).catch(apiErrorHandler("eliminar receta"));
    }
  },

  setAvailable: (id, available) => {
    set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, available } : p)) }));
    if (USE_API) {
      const p = get().products.find((x) => x.id === id);
      if (p) menuService.updateProduct({ ...p, available }).catch(apiErrorHandler("disponibilidad"));
    }
  },
}));

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function emptyProduct(category: string): Product {
  return {
    id: uid("p"),
    name: "",
    description: "",
    price: 0,
    category,
    image: "🍽️",
    tags: [],
    available: true,
    prepMinutes: 10,
    popular: false,
  };
}
