import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Category, Product } from "@/types";
import { CATEGORIES, PRODUCTS } from "@/mock/menu";

/**
 * Fuente de verdad del menú (categorías + productos). La administración del
 * restaurante puede crear/editar/eliminar desde el módulo "Menú", y los cambios
 * se reflejan en Toma de pedidos y en la página web del restaurante.
 */
interface MenuState {
  categories: Category[];
  products: Product[];
  addCategory: (c: Category) => void;
  removeCategory: (id: string) => void;
  addProduct: (p: Product) => void;
  updateProduct: (p: Product) => void;
  removeProduct: (id: string) => void;
}

export const useMenuStore = create<MenuState>()(
  persist(
    (set) => ({
      categories: structuredClone(CATEGORIES),
      products: structuredClone(PRODUCTS),
      addCategory: (c) => set((s) => ({ categories: [...s.categories, c] })),
      removeCategory: (id) =>
        set((s) => ({
          categories: s.categories.filter((c) => c.id !== id),
          products: s.products.filter((p) => p.category !== id),
        })),
      addProduct: (p) => set((s) => ({ products: [p, ...s.products] })),
      updateProduct: (p) => set((s) => ({ products: s.products.map((x) => (x.id === p.id ? p : x)) })),
      removeProduct: (id) => set((s) => ({ products: s.products.filter((p) => p.id !== id) })),
    }),
    { name: "axis-menu", version: 1 }
  )
);

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
