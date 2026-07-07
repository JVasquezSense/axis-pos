import type { SaleRecord } from "@/store/sales.store";
import { USE_API, request, mockRequest } from "./http";

export const salesService = {
  async getAll(): Promise<SaleRecord[]> {
    if (!USE_API) return mockRequest([], 400);
    const rows = await request<SaleRecord[]>("/sales/");
    return rows.map((r) => ({ ...r, id: String(r.id) }));
  },
  async record(s: Omit<SaleRecord, "id" | "ts">): Promise<SaleRecord> {
    if (!USE_API) return mockRequest({ ...s, id: `sale-${Date.now()}`, ts: Date.now() } as SaleRecord, 200);
    const saved = await request<SaleRecord>("/sales/", { method: "POST", body: JSON.stringify(s) });
    return { ...saved, id: String(saved.id) };
  },
};
