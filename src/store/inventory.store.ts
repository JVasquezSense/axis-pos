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

/**
 * Insumos a mostrar en selectores y costeo.
 *
 * Con backend NUNCA se rellena con el catálogo de ejemplo: un restaurante con el
 * inventario vacío veía insumos de la demo ("Pan de hamburguesa", "Tocineta") y
 * parecía que se le habían colado los de otro. Sin backend (modo demo) sí, que
 * es para lo que existe ese dataset.
 */
export function inventoryOrDemo(items: InventoryItem[]): InventoryItem[] {
  if (USE_API) return items;
  return items.length > 0 ? items : INVENTORY;
}

export function statusFor(stock: number, min: number): StockStatus {
  // Los decimales llegan como string desde DRF ("12.000"); comparar dos strings
  // con `<` es lexicografico ("12.000" < "3.000" === true). Coercionar siempre.
  const s = Number(stock);
  const m = Number(min);
  if (s <= m * 0.4) return "critical";
  if (s < m) return "low";
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
  /** Alta esperando confirmación del backend; devuelve el insumo guardado. */
  createItem: (item: InventoryItem) => Promise<InventoryItem | null>;
  updateItem: (item: InventoryItem) => void;
  deleteItem: (id: string) => void;
  applySale: (reference: string, lines: SaleLine[]) => Promise<{ affected: number; depletedItemIds: string[] }>;
  connectRealtime: (tenantId: string) => () => void;
  addPurchase: (reference: string, lines: { inventoryId: string; quantity: number; unitCost: number }[]) => void;
  applyPhysicalCount: (adjustments: { inventoryId: string; physical: number }[]) => number;
  reset: () => void;
}

export const useInventoryStore = create<InventoryState>()((set, get) => ({
  items: USE_API ? [] : structuredClone(INVENTORY),
  movements: USE_API ? [] : structuredClone(MOVEMENTS),

  load: async () => {
    if (!USE_API) return;
    // Cache = hidratación rápida offline; backend = fuente de verdad.
    const cached = readCache();
    if (cached && cached.items.length > 0) {
      set({ items: cached.items, movements: cached.movements });
    }
    try {
      const [items, movements] = await Promise.all([
        inventoryService.getItems(),
        inventoryService.getMovements(),
      ]);
      set({ items, movements });
      saveCache(get);
    } catch { /* offline: se conserva lo cacheado */ }
  },

  addItem: (item) => {
    set((s) => ({ items: [item, ...s.items] }));
    useAuditStore.getState().log({ action: "Insumo creado", details: `${item.name} · ${item.stock} ${item.unit}`, user: "Sistema", module: "inventario" });
    saveCache(get);
    if (USE_API) inventoryService.createItem(item).then((saved) => {
      set((s) => ({
        items: [saved, ...s.items.filter((x) => x.id !== item.id && String(x.id) !== String(saved.id))],
      }));
      saveCache(get);
    }).catch(apiErrorHandler("inventario"));
  },

  createItem: async (item) => {
    if (!USE_API) {
      get().addItem(item);
      return item;
    }
    try {
      const saved = await inventoryService.createItem(item);
      // El evento WS del alta puede llegar antes que esta respuesta: filtrar por
      // id evita que el insumo aparezca dos veces en la lista.
      set((s) => ({ items: [saved, ...s.items.filter((x) => String(x.id) !== String(saved.id))] }));
      useAuditStore.getState().log({ action: "Insumo creado", details: `${saved.name} · ${saved.stock} ${saved.unit}`, user: "Sistema", module: "inventario" });
      saveCache(get);
      return saved;
    } catch (err) {
      apiErrorHandler("crear insumo")(err);
      return null;
    }
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
    const name = get().items.find((x) => String(x.id) === String(id))?.name ?? id;
    set((s) => ({ items: s.items.filter((x) => x.id !== id) }));
    useAuditStore.getState().log({ action: "Insumo eliminado", details: name, user: "Sistema", module: "inventario" });
    saveCache(get);
    if (USE_API) inventoryService.deleteItem(id).catch(apiErrorHandler("eliminar insumo"));
  },

  applySale: async (reference, lines) => {
    // Con backend, el descuento y el kardex los escribe el servidor (una sola
    // fuente de verdad); el WS devuelve los insumos y movimientos ya aplicados.
    if (USE_API) {
      try {
        const { items, movements } = await inventoryService.consumeSale(reference, lines);
        if (items.length === 0) return { affected: 0, depletedItemIds: [] };
        const byId = new Map(items.map((i) => [String(i.id), i]));
        set((s) => ({
          items: s.items.map((i) => byId.get(String(i.id)) ?? i),
          movements: [...s.movements, ...movements],
        }));
        saveCache(get);
        return {
          affected: items.length,
          depletedItemIds: items.filter((i) => Number(i.stock) === 0).map((i) => i.id),
        };
      } catch (err) {
        apiErrorHandler("descontar inventario")(err);
        return { affected: 0, depletedItemIds: [] };
      }
    }

    const recipes = useRecipesStore.getState().recipes;
    const items = [...get().items];
    const moves: InventoryMovement[] = [];
    let affected = 0;

    lines.forEach((line) => {
      // Los ids llegan como number desde la API y como string cuando se crean
      // en el cliente: comparar sin coercionar dejaba la venta sin descontar stock.
      const recipe = recipes.find((rc) => String(rc.productId) === String(line.productId));
      if (!recipe) return;
      const portions = Math.max(recipe.portions, 1);
      recipe.ingredients.forEach((ing) => {
        const idx = items.findIndex((i) => String(i.id) === String(ing.inventoryId));
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

    const depletedItemIds = items.filter((i) => Number(i.stock) === 0).map((i) => i.id);
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
      const idx = items.findIndex((i) => String(i.id) === String(line.inventoryId));
      if (idx < 0 || line.quantity <= 0) return;
      const it = items[idx];
      // Number() explicito: si stock llega como string, `+` concatenaria.
      const newStock = r(Number(it.stock) + Number(line.quantity));
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
      const idx = items.findIndex((i) => String(i.id) === String(inventoryId));
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

  /**
   * Kardex en vivo: el backend emite `inventory.update` cada vez que el stock
   * se mueve (venta, compra, ajuste, alta de insumo), así la tabla y el kardex
   * se refrescan sin recargar la página.
   */
  connectRealtime: (tenantId) => {
    const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "";
    if (!USE_API || !WS_BASE || !tenantId || typeof window === "undefined") return () => {};
    let ws: WebSocket | null = null;
    let closed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const open = () => {
      if (closed) return;
      ws = new WebSocket(`${WS_BASE}/ws/kitchen/${tenantId}/`);
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (data.event !== "inventory.update") return;
          const incoming: InventoryItem[] = (data.items ?? []).map((i: InventoryItem) => ({
            ...i,
            stock: Number(i.stock),
            minStock: Number(i.minStock),
            cost: Number(i.cost),
          }));
          const moves: InventoryMovement[] = data.movements ?? [];
          const byId = new Map(incoming.map((i) => [String(i.id), i]));
          set((s) => {
            const known = new Set(s.items.map((i) => String(i.id)));
            const seen = new Set(s.movements.map((m) => String(m.id)));
            return {
              // Un insumo recién creado en otro dispositivo también debe aparecer.
              items: [
                ...s.items.map((i) => byId.get(String(i.id)) ?? i),
                ...incoming.filter((i) => !known.has(String(i.id))),
              ],
              movements: [...s.movements, ...moves.filter((m) => !seen.has(String(m.id)))],
            };
          });
          saveCache(get);
        } catch { /* fragmento inválido */ }
      };
      ws.onclose = () => {
        if (closed) return;
        retry = setTimeout(open, 3000);
      };
    };
    open();

    return () => {
      closed = true;
      if (retry) clearTimeout(retry);
      ws?.close();
    };
  },

  reset: () => set({ items: structuredClone(INVENTORY), movements: structuredClone(MOVEMENTS) }),
}));
