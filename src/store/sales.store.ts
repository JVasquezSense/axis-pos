import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PaymentMethod, Kpi } from "@/types";

/** Base histórica del día (mock) sobre la que se acumulan las ventas de la sesión. */
export const SALES_BASE = { sales: 4287500, orders: 67 };

export interface SaleRecord {
  id: string;
  total: number;
  items: number;
  method: PaymentMethod;
  saleType: string;
  table: number | null;
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
      record: (s) =>
        set((st) => ({ records: [{ ...s, id: `sale-${Date.now()}`, ts: Date.now() }, ...st.records] })),
      reset: () => set({ records: [] }),
    }),
    { name: "axis-sales", version: 1 }
  )
);

/** Totales del día = base histórica + ventas registradas en la sesión. */
export function liveDayTotals(records: SaleRecord[]) {
  const sales = SALES_BASE.sales + records.reduce((s, r) => s + r.total, 0);
  const orders = SALES_BASE.orders + records.length;
  const avg = orders > 0 ? Math.round(sales / orders) : 0;
  return { sales, orders, avg };
}

/** Reemplaza los KPIs de ventas/pedidos/ticket por los valores en vivo. */
export function applyLiveKpis(kpis: Kpi[], records: SaleRecord[]): Kpi[] {
  const { sales, orders, avg } = liveDayTotals(records);
  return kpis.map((k) =>
    k.id === "sales" ? { ...k, value: sales } : k.id === "orders" ? { ...k, value: orders } : k.id === "avg" ? { ...k, value: avg } : k
  );
}
