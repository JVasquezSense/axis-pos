import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PaymentMethod, Kpi } from "@/types";
import { USE_API } from "@/services/http";
import { salesService } from "@/services/sales.service";

/** Base histórica del día (mock) sobre la que se acumulan las ventas de la sesión. */
export const SALES_BASE = { sales: 0, orders: 0 };

export interface SaleRecord {
  id: string;
  total: number;
  items: number;
  method: PaymentMethod;
  saleType: string;
  table: number | null;
  tip: number;
  waiter: string;
  ts: number;
}

interface SalesState {
  records: SaleRecord[];
  record: (s: Omit<SaleRecord, "id" | "ts">) => void;
  reset: () => void;
}

export const useSalesStore = create<SalesState>()(
  persist(
    (set) => ({
      records: [],

      record: (s) => {
        const entry: SaleRecord = { ...s, id: `sale-${Date.now()}`, ts: Date.now() };
        set((st) => ({ records: [entry, ...st.records] }));
        if (USE_API) salesService.record(s).then((saved) =>
          set((st) => ({ records: st.records.map((r) => (r.id === entry.id ? saved : r)) }))
        ).catch(console.error);
      },

      reset: () => set({ records: [] }),
    }),
    { name: "axis-sales", version: 1 }
  )
);

/** Totales del día = ventas registradas en la sesión (cuando USE_API=true ya no hay base mock). */
export function liveDayTotals(records: SaleRecord[]) {
  const base = USE_API ? { sales: 0, orders: 0 } : SALES_BASE;
  const sales = base.sales + records.reduce((s, r) => s + r.total, 0);
  const orders = base.orders + records.length;
  const avg = orders > 0 ? Math.round(sales / orders) : 0;
  return { sales, orders, avg };
}

export function applyLiveKpis(kpis: Kpi[], records: SaleRecord[]): Kpi[] {
  const { sales, orders, avg } = liveDayTotals(records);
  return kpis.map((k) =>
    k.id === "sales" ? { ...k, value: sales } : k.id === "orders" ? { ...k, value: orders } : k.id === "avg" ? { ...k, value: avg } : k
  );
}
