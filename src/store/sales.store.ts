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
  /** Pedidos que cobró (para anularla y devolver el inventario). Solo al crear. */
  orderIds?: string[];
  /** Venta directa sin pedido: líneas que descontó al cobrar. Solo al crear. */
  consumedLines?: { productId: string; quantity: number }[];
  /** Lo devuelve el servidor: códigos de los pedidos cobrados. */
  orderCodes?: string[];
  /** Lo que se cobró, tal cual salió en el ticket. */
  lines?: { name: string; quantity: number; unitPrice: number; total: number; notes?: string; courtesy?: boolean }[];
  /** Valor regalado al cliente (líneas de cortesía o ticket entero). */
  courtesy?: number;
  /** Desglose de impuestos del ticket. */
  taxes?: { name: string; amount: number }[];
  ts: number;
}

interface SalesState {
  records: SaleRecord[];
  load: () => Promise<void>;
  record: (s: Omit<SaleRecord, "id" | "ts">) => Promise<SaleRecord>;
  /** Anula una venta. Lanza si el servidor la rechaza (p. ej. sin permiso). */
  remove: (id: string) => Promise<void>;
  reset: () => void;
}

export const useSalesStore = create<SalesState>()((set) => ({
  records: [],

  load: async () => {
    if (!USE_API) return;
    // Solo lo vendido desde el último cierre: antes venía todo el histórico y
    // el "total del turno" era el total de la vida del restaurante.
    const records = await salesService.getAll({ shift: "open" });
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

  remove: async (id) => {
    await salesService.remove(id);
    set((st) => ({ records: st.records.filter((r) => String(r.id) !== String(id)) }));
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
  // Con backend, los KPI ya vienen calculados para el rango elegido; pisarlos
  // con las ventas del turno dejaba el selector de fechas sin efecto.
  if (USE_API) return kpis;
  const { sales, orders, avg } = liveDayTotals(records);
  return kpis.map((k) =>
    k.id === "sales" ? { ...k, value: sales } : k.id === "orders" ? { ...k, value: orders } : k.id === "avg" ? { ...k, value: avg } : k
  );
}
