import { create } from "zustand";
import type { InventoryItem, InventoryMovement, StockStatus } from "@/types";
import { INVENTORY } from "@/mock/datasets";
import { MOVEMENTS } from "@/mock/kardex";
import { effectiveQty } from "@/lib/recipes";
import { useRecipesStore } from "./recipes.store";
import { USE_API, apiErrorHandler } from "@/services/http";
import { inventoryService } from "@/services/inventory.service";
import { useAuditStore } from "./audit.store";

const r = (n: number) => Math.round(n * 100) / 100;
const LS_KEY = "axis-inventory";

function saveCache(get: () => InventoryState) {
  try {
    const { items, movements } = get();
    localStorage.setItem(LS_KEY, JSON.stringify({ items, movements }));
    import("@/services/backend-sync").then(m => m.markNeedsSync()).catch(() => {});
  } catch { /* storage full */ }
}

function readCache(): { items: InventoryItem[]; movements: InventoryMovement[] } | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data?.state?.items) return { items: data.state.items, movements: data.state.movements ?? [] };
    if (data?.items) return data;
    return null;
  } catch { return null; }
}

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
  applyPhysicalCount: (adjustments: { inventoryId: string; physical: number }[]) => number;
  reset: () => void;
}

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  items: USE_API ? [] : structuredClone(INVENTORY),
  movements: USE_API ? [] : structuredClone(MOVEMENTS),

  load: async () => {
    if (!USE_API) return;
    const cached = readCache();
    if (cached && cached.items.length > 0) {
      set({ items: cached.items, movements: cached.movements });
      return;
    }
    try {
      const [items, movements] = await Promise.all([
        inventoryService.getItems(),
        inventoryService.getMovements(),
      ]);
      set({ items, movements });
      saveCache(get);
    } catch { /* API down, no cache available */ }
  },

  addItem: (item) => {
    set((s) => ({ items: [item, ...s.items] }));
    useAuditStore.getState().log({ action: "Insumo creado", details: `${item.name} · ${item.stock} ${item.unit}`, user: "Sistema", module: "inventario" });
    saveCache(get);
    if (USE_API) inventoryService.createItem(item).then((saved) => {
      set((s) => ({ items: s.items.map((x) => (x.id === item.id ? saved : x)) }));
      saveCache(get);
    }).catch(apiErrorHandler("inventario"));
  },

  updateItem: (item) => {
    set((s) => ({ items: s.items.map((x) => (x.id === item.id ? item : x)) }));
    useAuditStore.getState().log({ action: "Insumo actualizado", details: item.name, user: "Sistema", module: "inventario" });
    saveCache(get);
    if (USE_API) inventoryService.updateItem(item).then((saved) => {
      set((s) => ({ items: s.items.map((x) => (x.id === item.id ? saved : x)) }));
      saveCache(get);
    }).catch(apiErrorHandler("inventario"));
  },

  deleteItem: (id) => {
    const name = get().items.find((x) => x.id === id)?.name ?? id;
    set((s) => ({ items: s.items.filter((x) => x.id !== id) }));
    useAuditStore.getState().log({ action: "Insumo eliminado", details: name, user: "Sistema", module: "inventario" });
    saveCache(get);
    if (USE_API) inventoryService.deleteItem(id).catch(apiErrorHandler("eliminar insumo"));
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
          inventoryService.adjustStock(it.id, newStock, `Venta ${reference}`).catch(apiErrorHandler("ajuste stock"));
        }
      });
    });

    const depletedItemIds = items.filter((i) => i.stock === 0).map((i) => i.id);
    if (moves.length) {
      set({ items, movements: [...get().movements, ...moves] });
      saveCache(get);
    }
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
    if (moves.length) {
      set({ items, movements: [...get().movements, ...moves] });
      saveCache(get);
    }
  },

  applyPhysicalCount: (adjustments) => {
    const items = [...get().items];
    const moves: InventoryMovement[] = [];
    let applied = 0;
    adjustments.forEach(({ inventoryId, physical }) => {
      const idx = items.findIndex((i) => i.id === inventoryId);
      if (idx < 0) return;
      const it = items[idx];
      const diff = r(physical - it.stock);
      if (diff === 0) return;
      const newStock = r(Math.max(physical, 0));
      items[idx] = { ...it, stock: newStock, status: statusFor(newStock, it.minStock), updatedAt: "Justo ahora" };
      moves.push({
        id: `mv-count-${Date.now()}-${idx}`,
        inventoryId: it.id,
        date: "Hoy",
        type: "ajuste",
        quantity: diff,
        balance: newStock,
        unitCost: it.cost,
        reason: "Conteo físico",
      });
      applied++;
      if (USE_API) inventoryService.adjustStock(it.id, newStock, "Conteo físico").catch(apiErrorHandler("ajuste stock"));
    });
    if (moves.length) {
      set({ items, movements: [...get().movements, ...moves] });
      saveCache(get);
    }
    return applied;
  },

  reset: () => set({ items: structuredClone(INVENTORY), movements: structuredClone(MOVEMENTS) }),
}));
