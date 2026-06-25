import { create } from "zustand";
import type { InventoryItem, InventoryMovement, StockStatus } from "@/types";
import { INVENTORY } from "@/mock/datasets";
import { MOVEMENTS } from "@/mock/kardex";
import { effectiveQty } from "@/lib/recipes";
import { useRecipesStore } from "./recipes.store";
import { USE_API } from "@/services/http";
import { inventoryService } from "@/services/inventory.service";

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
  load: () => Promise<void>;
  addItem: (item: InventoryItem) => void;
  updateItem: (item: InventoryItem) => void;
  deleteItem: (id: string) => void;
  applySale: (reference: string, lines: SaleLine[]) => { affected: number; depletedItemIds: string[] };
  addPurchase: (reference: string, lines: { inventoryId: string; quantity: number; unitCost: number }[]) => void;
  reset: () => void;
}

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  items: USE_API ? [] : structuredClone(INVENTORY),
  movements: USE_API ? [] : structuredClone(MOVEMENTS),

  load: async () => {
    if (!USE_API) return;
    const [items, movements] = await Promise.all([
      inventoryService.getItems(),
      inventoryService.getMovements(),
    ]);
    set({ items, movements });
  },

  addItem: (item) => {
    set((s) => ({ items: [item, ...s.items] }));
    if (USE_API) inventoryService.createItem(item).then((saved) =>
      set((s) => ({ items: s.items.map((x) => (x.id === item.id ? saved : x)) }))
    ).catch(console.error);
  },

  updateItem: (item) => {
    set((s) => ({ items: s.items.map((x) => (x.id === item.id ? item : x)) }));
    if (USE_API) inventoryService.updateItem(item).catch(console.error);
  },

  deleteItem: (id) => {
    set((s) => ({ items: s.items.filter((x) => x.id !== id) }));
    if (USE_API) inventoryService.deleteItem(id).catch(console.error);
  },

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
        if (USE_API) {
          inventoryService.adjustStock(it.id, newStock, `Venta ${reference}`).catch(console.error);
        }
      });
    });

    const depletedItemIds = items.filter((i) => i.stock === 0).map((i) => i.id);
    if (moves.length) set({ items, movements: [...get().movements, ...moves] });
    return { affected, depletedItemIds };
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
}));
