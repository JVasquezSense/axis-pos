import type { SaleRecord } from "@/store/sales.store";
import { USE_API, request, mockRequest } from "./http";

export const salesService = {
  async getAll(): Promise<SaleRecord[]> {
    return USE_API ? request<SaleRecord[]>("/sales/") : mockRequest([], 400);
  },
  async record(s: Omit<SaleRecord, "id" | "ts">): Promise<SaleRecord> {
    return USE_API
      ? request<SaleRecord>("/sales/", { method: "POST", body: JSON.stringify(s) })
      : mockRequest({ ...s, id: `sale-${Date.now()}`, ts: Date.now() } as SaleRecord, 200);
  },
};
