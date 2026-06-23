import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { InventoryItem, InventoryMovement, StockStatus } from "@/types";
import { INVENTORY } from "@/mock/datasets";
import { MOVEMENTS } from "@/mock/kardex";
import { effectiveQty } from "@/lib/recipes";
import { useRecipesStore } from "./recipes.store";

const r = (n: number) => Math.round(n * 100) / 100;

export function statusFor(stock: number, min: number): StockStatus {
  if (stock <= min * 0.4) return "critical";
  if (stock < min) return "low";
  return "normal";
}

export interface SaleLine {
  productId: string;
  quantity: number;
}

interface InventoryState {
  items: InventoryItem[];
  movements: InventoryMovement[];
  addItem: (item: InventoryItem) => void;
  /**
   * Registra una venta: descuenta los insumos de cada producto según su receta
   * y genera los movimientos de salida en el kardex. Devuelve cuántas salidas creó.
   */
  applySale: (reference: string, lines: SaleLine[]) => { affected: number };
  /** Registra una compra: aumenta el stock y genera entradas en el kardex. */
  addPurchase: (reference: string, lines: { inventoryId: string; quantity: number; unitCost: number }[]) => void;
  reset: () => void;
}

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      items: structuredClone(INVENTORY),
      movements: structuredClone(MOVEMENTS),

      addItem: (item) => set((s) => ({ items: [item, ...s.items] })),

      applySale: (reference, lines) => {
        const recipes = useRecipesStore.getState().recipes;
        const items = [...get().items];
        const moves: InventoryMovement[] = [];
        let affected = 0;

        lines.forEach((line) => {
          const recipe = recipes.find((rc) => rc.productId === line.productId);
          if (!recipe) return;
          const portions = Math.max(recipe.portions, 1);
          recipe.ingredients.forEach((ing) => {
            const idx = items.findIndex((i) => i.id === ing.inventoryId);
            if (idx < 0) return;
            const consumed = r((effectiveQty(ing) / portions) * line.quantity);
            if (consumed <= 0) return;
            const it = items[idx];
            const newStock = r(Math.max(it.stock - consumed, 0));
            items[idx] = { ...it, stock: newStock, status: statusFor(newStock, it.minStock), updatedAt: "Justo ahora" };
            moves.push({
              id: `mv-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
              inventoryId: it.id,
              date: "Hoy",
              type: "salida",
              quantity: -consumed,
              balance: newStock,
              unitCost: it.cost,
              reason: `Venta ${reference}`,
            });
            affected++;
          });
        });

        if (moves.length) set({ items, movements: [...get().movements, ...moves] });
        return { affected };
      },

      addPurchase: (reference, lines) => {
        const items = [...get().items];
        const moves: InventoryMovement[] = [];
        lines.forEach((line, n) => {
          const idx = items.findIndex((i) => i.id === line.inventoryId);
          if (idx < 0 || line.quantity <= 0) return;
          const it = items[idx];
          const newStock = r(it.stock + line.quantity);
          const cost = line.unitCost > 0 ? line.unitCost : it.cost;
          items[idx] = { ...it, stock: newStock, cost, status: statusFor(newStock, it.minStock), updatedAt: "Justo ahora" };
          moves.push({
            id: `mv-buy-${Date.now()}-${n}`,
            inventoryId: it.id,
            date: "Hoy",
            type: "entrada",
            quantity: r(line.quantity),
            balance: newStock,
            unitCost: cost,
            reason: `Compra ${reference}`,
          });
        });
        if (moves.length) set({ items, movements: [...get().movements, ...moves] });
      },

      reset: () => set({ items: structuredClone(INVENTORY), movements: structuredClone(MOVEMENTS) }),
    }),
    { name: "axis-inventory", version: 1, storage: createJSONStorage(() => localStorage) }
  )
);
