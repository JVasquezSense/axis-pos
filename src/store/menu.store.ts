import { create } from "zustand";
import type { Category, Product } from "@/types";
import { CATEGORIES, PRODUCTS } from "@/mock/menu";
import { USE_API, apiErrorHandler } from "@/services/http";
import { menuService } from "@/services/menu.service";
import { useAuditStore } from "./audit.store";
import { useRecipesStore } from "./recipes.store";
import { recipesService } from "@/services/recipes.service";

const LS_KEY = "axis-menu";

function saveCache(get: () => MenuState) {
  try {
    const { categories, products } = get();
    localStorage.setItem(LS_KEY, JSON.stringify({ categories, products }));
    import("@/services/backend-sync").then(m => m.markNeedsSync()).catch(() => {});
  } catch { /* storage full or unavailable */ }
}

function readCache(): { categories: Category[]; products: Product[] } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.state) return { categories: data.state.categories ?? [], products: data.state.products ?? [] };
    if (data?.products) return data;
    return null;
  } catch { return null; }
}

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
    const cached = readCache();
    if (cached && cached.products.length > 0) {
      set({ categories: cached.categories, products: cached.products });
      return;
    }
    try {
      const [categories, products] = await Promise.all([
        menuService.getCategories(),
        menuService.getProducts(),
      ]);
      set({ categories, products });
      saveCache(get);
    } catch { /* API down, no cache available */ }
  },

  addCategory: (c) => {
    set((s) => ({ categories: [...s.categories, c] }));
    useAuditStore.getState().log({ action: "Categoría creada", details: c.name, user: "Sistema", module: "menu" });
    saveCache(get);
    if (USE_API) menuService.createCategory(c).then((saved) => {
      set((s) => ({ categories: s.categories.map((x) => (x.id === c.id ? saved : x)) }));
      saveCache(get);
    }).catch(apiErrorHandler("categoría"));
  },

  removeCategory: (id) => {
    const cat = get().categories.find((c) => c.id === id);
    const removedProducts = get().products.filter((p) => p.category === id);
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      products: s.products.filter((p) => p.category !== id),
    }));
    useAuditStore.getState().log({ action: "Categoría eliminada", details: `${cat?.name ?? id} · ${removedProducts.length} productos`, user: "Sistema", module: "menu" });
    saveCache(get);
    if (USE_API) menuService.deleteCategory(id).catch(apiErrorHandler("eliminar categoría"));
    removedProducts.forEach((p) => {
      const recipe = useRecipesStore.getState().recipes.find((r) => String(r.productId) === String(p.id));
      if (!recipe) return;
      useRecipesStore.setState((s) => ({ recipes: s.recipes.filter((r) => r.id !== recipe.id) }));
      if (USE_API) recipesService.remove(recipe.id).catch(apiErrorHandler("eliminar receta"));
    });
  },

  addProduct: (p) => {
    set((s) => ({ products: [p, ...s.products] }));
    useAuditStore.getState().log({ action: "Producto creado", details: `${p.name} · $${p.price}`, user: "Sistema", module: "menu" });
    saveCache(get);
    if (USE_API) menuService.createProduct(p).then((saved) => {
      set((s) => ({ products: s.products.map((x) => (x.id === p.id ? saved : x)) }));
      saveCache(get);
    }).catch(apiErrorHandler("producto"));
  },

  updateProduct: (p) => {
    set((s) => ({ products: s.products.map((x) => (x.id === p.id ? p : x)) }));
    useAuditStore.getState().log({ action: "Producto actualizado", details: `${p.name} · $${p.price}`, user: "Sistema", module: "menu" });
    saveCache(get);
    if (USE_API) menuService.updateProduct(p).catch(apiErrorHandler("producto"));
  },

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
    const name = get().products.find((p) => p.id === id)?.name ?? id;
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
    useAuditStore.getState().log({ action: "Producto eliminado", details: name, user: "Sistema", module: "menu" });
    saveCache(get);
    if (USE_API) menuService.deleteProduct(id).catch(apiErrorHandler("eliminar producto"));
    const recipe = useRecipesStore.getState().recipes.find((r) => String(r.productId) === String(id));
    if (recipe) {
      useRecipesStore.setState((s) => ({ recipes: s.recipes.filter((r) => r.id !== recipe.id) }));
      if (USE_API) recipesService.remove(recipe.id).catch(apiErrorHandler("eliminar receta"));
    }
  },

  setAvailable: (id, available) => {
    set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, available } : p)) }));
    saveCache(get);
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
