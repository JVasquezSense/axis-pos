import type { Tax } from "@/types";
import { USE_API, request, mockRequest } from "./http";

/** Impuestos de ejemplo para el modo demo (sin backend). */
const DEMO_TAXES: Tax[] = [
  { id: "tax-iva", name: "IVA", type: "percent", rate: 8, isDefault: true, active: true },
];

export const taxesService = {
  async list(): Promise<Tax[]> {
    return USE_API ? request<Tax[]>("/taxes/") : mockRequest(DEMO_TAXES, 300);
  },
  async create(t: Omit<Tax, "id">): Promise<Tax> {
    return USE_API
      ? request<Tax>("/taxes/", { method: "POST", body: JSON.stringify(t) })
      : mockRequest({ ...t, id: `tax-${Date.now()}` } as Tax, 150);
  },
  async update(t: Tax): Promise<Tax> {
    return USE_API
      ? request<Tax>(`/taxes/${t.id}/`, { method: "PATCH", body: JSON.stringify(t) })
      : mockRequest(t, 150);
  },
  async remove(id: string): Promise<void> {
    if (USE_API) await request<void>(`/taxes/${id}/`, { method: "DELETE" });
  },
};
