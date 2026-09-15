import type { ShiftClose } from "@/store/history.store";
import { USE_API, request, mockRequest } from "./http";

const num = (v: unknown) => Number(v ?? 0) || 0;

function normalize(s: ShiftClose): ShiftClose {
  return {
    ...s,
    id: String(s.id),
    // Los cierres reconstruidos en el servidor traen las ventas tal cual las
    // serializa el API: id numérico y decimales como texto. El historial hacía
    // `id.slice(...)` y reventaba la página entera.
    records: (s.records ?? []).map((r) => ({
      ...r,
      id: String(r.id),
      total: num(r.total),
      tip: num(r.tip),
      items: num(r.items),
      waiter: r.waiter ?? "",
      saleType: r.saleType ?? "",
      lines: (r.lines ?? []).map((l) => ({ ...l, quantity: num(l.quantity), unitPrice: num(l.unitPrice), total: num(l.total) })),
    })),
    byMethod: Object.fromEntries(Object.entries(s.byMethod ?? {}).map(([k, v]) => [k, num(v)])),
    byWaiter: Object.fromEntries(Object.entries(s.byWaiter ?? {}).map(([k, v]) => [k, num(v)])),
    orders: num(s.orders),
    sales: Number(s.sales),
    avg: Number(s.avg ?? 0),
    totalTips: Number(s.totalTips ?? 0),
    number: s.number != null ? Number(s.number) : undefined,
    startedAt: s.startedAt != null ? Number(s.startedAt) : null,
  };
}

/** Cierres de turno persistidos en el backend, filtrados por tenant. */
export const shiftsService = {
  async list(): Promise<ShiftClose[]> {
    if (!USE_API) return mockRequest([], 300);
    const rows = await request<ShiftClose[]>("/shifts/");
    return rows.map(normalize);
  },
  async create(shift: Omit<ShiftClose, "id" | "ts">): Promise<ShiftClose> {
    if (!USE_API) {
      return mockRequest({ ...shift, id: `shift-${Date.now()}`, ts: Date.now() } as ShiftClose, 200);
    }
    const saved = await request<ShiftClose>("/shifts/", { method: "POST", body: JSON.stringify(shift) });
    return normalize(saved);
  },
};
