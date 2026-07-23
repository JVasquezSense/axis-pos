import { create } from "zustand";
import type { PaymentMethod, Kpi } from "@/types";
import { USE_API, apiErrorHandler } from "@/services/http";
import { salesService } from "@/services/sales.service";

export const SALES_BASE = { sales: 0, orders: 0 };

export interface SaleRecord {
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
  invoiceNumber?: string;
  ts: number;
}

interface SalesState {
  records: SaleRecord[];
  load: () => Promise<void>;
  record: (s: Omit<SaleRecord, "id" | "ts">) => Promise<SaleRecord>;
  reset: () => void;
}

export const useSalesStore = create<SalesState>()((set) => ({
  records: [],

  load: async () => {
    if (!USE_API) return;
    const records = await salesService.getAll();
    set({ records });
  },

  record: async (s) => {
    const entry: SaleRecord = { ...s, id: `sale-${Date.now()}`, ts: Date.now() };
    set((st) => ({ records: [entry, ...st.records] }));
    if (USE_API) {
      try {
        const saved = await salesService.record(s);
        set((st) => ({ records: st.records.map((r) => (r.id === entry.id ? saved : r)) }));
        return saved;
      } catch (e) {
        apiErrorHandler("venta")(e);
        return entry;
      }
    }
    return entry;
  },

  reset: () => set({ records: [] }),
}));

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
