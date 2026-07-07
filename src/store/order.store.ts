import { create } from "zustand";
import type { OrderLine, Product, ModifierOption, OrderChannel } from "@/types";
import { USE_API, apiErrorHandler } from "@/services/http";
import { ordersService } from "@/services/orders.service";
import { useKitchenStore } from "./kitchen.store";

export const TAX_RATE = 0.08;

interface OrderState {
  tableNumber: number | null;
  lines: OrderLine[];
  tableOrders: Record<string, OrderLine[]>;
  /** Ids reales de Order en el backend que componen la cuenta actual (para marcarlos "paid" al cobrar). */
  activeOrderIds: string[];
  tip: number;
  discount: number;
  setTable: (n: number | null) => void;
  /** Carga la cuenta real de una mesa desde el backend (sobrevive recarga y multi-dispositivo). */
  loadTableOrder: (n: number) => Promise<void>;
  addProduct: (product: Product, modifiers?: ModifierOption[], notes?: string) => void;
  increment: (lineId: string) => void;
  decrement: (lineId: string) => void;
  setNotes: (lineId: string, notes: string) => void;
  remove: (lineId: string) => void;
  setTip: (v: number) => void;
  setDiscount: (v: number) => void;
  flushToTable: () => void;
  /** Envía el pedido actual a cocina: crea el Order real en el backend (o el ticket local en modo mock). */
  sendToKitchen: (channel: OrderChannel) => Promise<{ id: string; code: string }>;
  /** Marca como pagados los Order reales que componen la cuenta actual. */
  markPaid: () => Promise<void>;
  clear: () => void;
}

const lineTotal = (l: OrderLine) =>
  (l.unitPrice + l.modifiers.reduce((s, m) => s + m.price, 0)) * l.quantity;

export const useOrderStore = create<OrderState>()((set, get) => ({
  tableNumber: null,
  lines: [],
  tableOrders: {},
  activeOrderIds: [],
  tip: 0,
  discount: 0,

  setTable: (n) =>
    set((s) => {
      const saved: Record<string, OrderLine[]> = { ...s.tableOrders };
      if (s.tableNumber !== null && s.tableNumber !== n) {
        saved[String(s.tableNumber)] = s.lines;
      }
      const nextLines = n !== null ? (saved[String(n)] ?? []) : [];
      return { tableNumber: n, tableOrders: saved, lines: nextLines, activeOrderIds: [] };
    }),

  loadTableOrder: async (n) => {
    if (!USE_API) {
      get().setTable(n);
      return;
    }
    try {
      const orders = await ordersService.getActive(n);
      const lines: OrderLine[] = orders.flatMap((o) =>
        o.lines.map((l) => ({
          id: `${o.id}-${l.id}`,
          product: l.product,
          quantity: l.quantity,
          modifiers: [],
          notes: l.notes,
          unitPrice: l.unitPrice,
        }))
      );
      set({ tableNumber: n, lines, activeOrderIds: orders.map((o) => String(o.id)) });
    } catch {
      // Sin conexión: cae al último estado local conocido para no bloquear al usuario.
      get().setTable(n);
    }
  },

  addProduct: (product, modifiers = [], notes) =>
    set((state) => {
      const sig = `${product.id}-${modifiers.map((m) => m.id).join(",")}-${notes ?? ""}`;
      const existing = state.lines.find(
        (l) => `${l.product.id}-${l.modifiers.map((m) => m.id).join(",")}-${l.notes ?? ""}` === sig
      );
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.id === existing.id ? { ...l, quantity: l.quantity + 1 } : l
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          {
            id: `${sig}-${Date.now()}`,
            product,
            quantity: 1,
            modifiers,
            notes,
            unitPrice: product.price,
          },
        ],
      };
    }),

  increment: (lineId) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.id === lineId ? { ...l, quantity: l.quantity + 1 } : l)),
    })),

  decrement: (lineId) =>
    set((s) => ({
      lines: s.lines
        .map((l) => (l.id === lineId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    })),

  setNotes: (lineId, notes) =>
    set((s) => ({ lines: s.lines.map((l) => (l.id === lineId ? { ...l, notes } : l)) })),

  remove: (lineId) => set((s) => ({ lines: s.lines.filter((l) => l.id !== lineId) })),
  setTip: (v) => set({ tip: v }),
  setDiscount: (v) => set({ discount: v }),

  flushToTable: () =>
    set((s) => {
      if (s.tableNumber === null) return { lines: [] };
      const existing = s.tableOrders[String(s.tableNumber)] ?? [];
      const merged = [...existing];
      s.lines.forEach((line) => {
        const sig = `${line.product.id}-${line.modifiers.map((m) => m.id).join(",")}-${line.notes ?? ""}`;
        const idx = merged.findIndex(
          (l) => `${l.product.id}-${l.modifiers.map((m) => m.id).join(",")}-${l.notes ?? ""}` === sig
        );
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + line.quantity };
        } else {
          merged.push(line);
        }
      });
      return { lines: [], tableOrders: { ...s.tableOrders, [String(s.tableNumber)]: merged } };
    }),

  sendToKitchen: async (channel) => {
    const { lines, tableNumber } = get();
    if (USE_API) {
      const code = `OC-${Date.now().toString(36).toUpperCase()}`;
      const saved = await ordersService.createOrder({
        code,
        channel,
        table: tableNumber,
        lines: lines.map((l) => ({
          productId: l.product.id,
          quantity: l.quantity,
          // La IA/modificadores no tienen columna propia en el backend: se
          // pliegan en el precio unitario efectivo y se listan en las notas.
          unitPrice: l.unitPrice + l.modifiers.reduce((s, m) => s + m.price, 0),
          notes: [...l.modifiers.map((m) => m.name), l.notes].filter(Boolean).join(" · ") || undefined,
        })),
      });
      get().flushToTable();
      return { id: String(saved.id), code: saved.code };
    }
    const ticket = useKitchenStore.getState().addFromOrder(lines, tableNumber, channel);
    get().flushToTable();
    return { id: ticket.id, code: ticket.code };
  },

  markPaid: async () => {
    const { activeOrderIds } = get();
    if (!USE_API || activeOrderIds.length === 0) return;
    await Promise.all(
      activeOrderIds.map((id) => ordersService.updateStatus(id, "paid").catch(apiErrorHandler("cerrar pedido")))
    );
  },

  clear: () =>
    set((s) => {
      const tableOrders = { ...s.tableOrders };
      if (s.tableNumber !== null) delete tableOrders[String(s.tableNumber)];
      return { lines: [], tip: 0, discount: 0, tableNumber: null, tableOrders, activeOrderIds: [] };
    }),
}));

export const orderSelectors = {
  subtotal: (lines: OrderLine[]) => lines.reduce((s, l) => s + lineTotal(l), 0),
  count: (lines: OrderLine[]) => lines.reduce((s, l) => s + l.quantity, 0),
  lineTotal,
};
