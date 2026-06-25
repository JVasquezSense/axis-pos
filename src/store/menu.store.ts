import { create } from "zustand";
import type { Category, Product } from "@/types";
import { CATEGORIES, PRODUCTS } from "@/mock/menu";
import { USE_API } from "@/services/http";
import { menuService } from "@/services/menu.service";

interface MenuState {
  categories: Category[];
  products: Product[];
  load: () => Promise<void>;
  addCategory: (c: Category) => void;
  removeCategory: (id: string) => void;
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
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
    ).catch(console.error);
  },

  removeCategory: (id) => {
    set((s) => ({
      categories: s.categories.filter((c) => c.id !== id),
      products: s.products.filter((p) => p.category !== id),
    }));
    if (USE_API) menuService.deleteCategory(id).catch(console.error);
  },

  addProduct: (p) => {
    set((s) => ({ products: [p, ...s.products] }));
    if (USE_API) menuService.createProduct(p).then((saved) =>
      set((s) => ({ products: s.products.map((x) => (x.id === p.id ? saved : x)) }))
    ).catch(console.error);
  },

  updateProduct: (p) => {
    set((s) => ({ products: s.products.map((x) => (x.id === p.id ? p : x)) }));
    if (USE_API) menuService.updateProduct(p).catch(console.error);
  },

  removeProduct: (id) => {
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
    if (USE_API) menuService.deleteProduct(id).catch(console.error);
  },

  setAvailable: (id, available) => {
    set((s) => ({ products: s.products.map((p) => (p.id === id ? { ...p, available } : p)) }));
    if (USE_API) {
      const p = get().products.find((x) => x.id === id);
      if (p) menuService.updateProduct({ ...p, available }).catch(console.error);
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
