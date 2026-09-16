import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PaymentMethod } from "@/types";
import { USE_API } from "@/services/http";
import { useSalesStore } from "./sales.store";
import { salesService } from "@/services/sales.service";
import { shiftsService } from "@/services/shifts.service";

export interface ArchivedSale {
  id: string;
  total: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  items: number;
  method: PaymentMethod;
  saleType: string;
  table: number | null;
  tip: number;
  waiter: string;
  customer?: string;
  observations?: string;
  ts: number;
  invoiceNumber?: string;
  orderCodes?: string[];
  lines?: { name: string; quantity: number; unitPrice: number; total: number; notes?: string; courtesy?: boolean }[];
  courtesy?: number;
  taxes?: { name: string; amount: number }[];
}

export interface ShiftClose {
  id: string;
  /** Correlativo por restaurante: "Turno #12". Lo asigna el servidor. */
  number?: number;
  /** Cuándo arrancó el turno (cierre anterior o primera venta). */
  startedAt?: number | null;
  /** Cuándo se cerró. */
  ts: number;
  sales: number;
  orders: number;
  avg: number;
  totalTips: number;
  byMethod: Record<string, number>;
  byWaiter: Record<string, number>;
  closedBy: string;
  records: ArchivedSale[];
}

interface HistoryState {
  sales: ArchivedSale[];
  shifts: ShiftClose[];
  loading: boolean;
  loaded: boolean;
  /** Trae todas las ventas reales del backend y las fusiona con las locales. */
  load: () => Promise<void>;
  archiveSales: (records: ArchivedSale[]) => void;
  /** Anula una venta en el servidor (devuelve el inventario) y la quita de aquí. */
  removeSale: (id: string) => Promise<void>;
  /** Guarda el cierre; con backend, lanza si el servidor lo rechaza. */
  closeShift: (shift: Omit<ShiftClose, "id" | "ts">) => Promise<void>;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      sales: [],
      shifts: [],
      loading: false,
      loaded: false,

      load: async () => {
        if (!USE_API || get().loading) return;
        set({ loading: true });
        // Los cierres de turno ahora viven en el backend (antes solo localStorage,
        // así que no cruzaban de dispositivo).
        shiftsService.list()
          .then((shifts) => { if (shifts.length) set({ shifts }); })
          .catch(() => { /* sin conexión: se conserva lo local */ });
        try {
          const remote = await salesService.getAll();
          // El backend es la única fuente de verdad. Antes se conservaban las
          // ventas locales que "no estaban en el backend", así que una venta
          // borrada en el servidor seguía apareciendo aquí para siempre.
          const merged = [...remote].sort((a, b) => b.ts - a.ts).slice(0, 2000);
          set({ sales: merged, loading: false, loaded: true });
        } catch {
          set({ loading: false, loaded: true });
        }
      },

      archiveSales: (records) =>
        set((s) => ({ sales: [...records, ...s.sales].slice(0, 2000) })),

      removeSale: async (id) => {
        await salesService.remove(id);
        set((s) => ({ sales: s.sales.filter((x) => String(x.id) !== String(id)) }));
        // La caja también tiene su lista del día.
        useSalesStore.setState((st) => ({ records: st.records.filter((r) => String(r.id) !== String(id)) }));
      },

      closeShift: async (shift) => {
        if (!USE_API) {
          const entry: ShiftClose = { ...shift, id: `shift-${Date.now().toString(36)}`, ts: Date.now() };
          set((s) => ({ shifts: [entry, ...s.shifts].slice(0, 100) }));
          return;
        }
        // El cierre manda en el servidor: desde su fecha arranca el turno
        // siguiente. Si falla, no se limpia nada en la caja.
        const saved = await shiftsService.create(shift);
        set((s) => ({ shifts: [saved, ...s.shifts.filter((x) => x.id !== saved.id)].slice(0, 100) }));
      },
    }),
    { name: "axis-history", partialize: (s) => ({ sales: s.sales, shifts: s.shifts }) }
  )
);
