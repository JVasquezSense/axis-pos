import type { SaleRecord } from "@/store/sales.store";
import { USE_API, request, mockRequest } from "./http";

function normalizeSale(r: SaleRecord): SaleRecord {
  // `ts` llega como fecha ISO; el filtro de periodo compara números y con un
  // string la comparación daba NaN: ningún rango filtraba nada.
  const ts = typeof r.ts === "number" ? r.ts : new Date(r.ts as unknown as string).getTime();
  return {
    ...r,
    id: String(r.id),
    total: Number(r.total),
    subtotal: r.subtotal != null ? Number(r.subtotal) : undefined,
    tax: r.tax != null ? Number(r.tax) : undefined,
    discount: r.discount != null ? Number(r.discount) : undefined,
    tip: Number(r.tip ?? 0),
    ts: Number.isFinite(ts) ? ts : Date.now(),
    lines: (r.lines ?? []).map((l) => ({ ...l, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice), total: Number(l.total) })),
    taxes: (r.taxes ?? []).map((t) => ({ ...t, amount: Number(t.amount) })),
  };
}

export const salesService = {
  /**
   * `shift: "open"` trae solo las ventas desde el último cierre de turno;
   * `from`/`to` (YYYY-MM-DD) acotan por fecha. Sin opciones: todo el histórico.
   */
  async getAll(opts: { shift?: "open"; from?: string; to?: string } = {}): Promise<SaleRecord[]> {
    if (!USE_API) return mockRequest([], 400);
    const qs = new URLSearchParams();
    if (opts.shift) qs.set("shift", opts.shift);
    if (opts.from) qs.set("from", opts.from);
    if (opts.to) qs.set("to", opts.to);
    const q = qs.toString();
    const rows = await request<SaleRecord[]>(q ? `/sales/?${q}` : "/sales/");
    return rows.map(normalizeSale);
  },
  async record(s: Omit<SaleRecord, "id" | "ts">): Promise<SaleRecord> {
    if (!USE_API) return mockRequest({ ...s, id: `sale-${Date.now()}`, ts: Date.now() } as SaleRecord, 200);
    const saved = await request<SaleRecord>("/sales/", { method: "POST", body: JSON.stringify(s) });
    return normalizeSale(saved);
  },
  /** Anula la venta; el servidor devuelve al inventario lo que descontó. */
  async remove(id: string): Promise<void> {
    if (USE_API) await request<void>(`/sales/${id}/`, { method: "DELETE" });
  },
};
