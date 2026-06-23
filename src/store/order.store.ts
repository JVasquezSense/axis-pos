import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { OrderLine, Product, ModifierOption } from "@/types";

export const TAX_RATE = 0.08;

interface OrderState {
  tableNumber: number | null;
  lines: OrderLine[];
  tableOrders: Record<string, OrderLine[]>; // snapshot por mesa
  tip: number;
  discount: number;
  setTable: (n: number | null) => void;
  addProduct: (product: Product, modifiers?: ModifierOption[], notes?: string) => void;
  increment: (lineId: string) => void;
  decrement: (lineId: string) => void;
  setNotes: (lineId: string, notes: string) => void;
  remove: (lineId: string) => void;
  setTip: (v: number) => void;
  setDiscount: (v: number) => void;
  clear: () => void;
}

const lineTotal = (l: OrderLine) =>
  (l.unitPrice + l.modifiers.reduce((s, m) => s + m.price, 0)) * l.quantity;

export const useOrderStore = create<OrderState>()(
  persist(
    (set, get) => ({
  tableNumber: null,
  lines: [],
  tableOrders: {},
  tip: 0,
  discount: 0,
  setTable: (n) =>
    set((s) => {
      // Guarda las lines actuales en la mesa anterior
      const saved: Record<string, OrderLine[]> = { ...s.tableOrders };
      if (s.tableNumber !== null) saved[String(s.tableNumber)] = s.lines;
      // Carga las lines de la nueva mesa (o vacías si es venta directa)
      const nextLines = n !== null ? (saved[String(n)] ?? []) : [];
      return { tableNumber: n, tableOrders: saved, lines: nextLines };
    }),
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
  clear: () =>
    set((s) => {
      const tableOrders = { ...s.tableOrders };
      if (s.tableNumber !== null) delete tableOrders[String(s.tableNumber)];
      return { lines: [], tip: 0, discount: 0, tableNumber: null, tableOrders };
    }),
    }),
    {
      name: "axis-order",
      partialize: (s) => ({ lines: s.lines, tableNumber: s.tableNumber, tableOrders: s.tableOrders, tip: s.tip, discount: s.discount }),
    }
  )
);

// Selectores derivados
export const orderSelectors = {
  subtotal: (lines: OrderLine[]) => lines.reduce((s, l) => s + lineTotal(l), 0),
  count: (lines: OrderLine[]) => lines.reduce((s, l) => s + l.quantity, 0),
  lineTotal,
};
