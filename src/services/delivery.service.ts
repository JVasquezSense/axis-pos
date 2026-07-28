import type { DeliveryOrder, DeliveryStatus } from "@/store/delivery.store";
import { USE_API, request, mockRequest } from "./http";

function normalize(d: DeliveryOrder): DeliveryOrder {
  return {
    ...d,
    id: String(d.id),
    total: Number(d.total ?? 0),
    tip: Number(d.tip ?? 0),
    lat: Number(d.lat ?? 0),
    lng: Number(d.lng ?? 0),
    driverId: d.driverId != null ? String(d.driverId) : null,
  };
}

/** Domicilios persistidos en el backend, filtrados por tenant. */
export const deliveryService = {
  async list(): Promise<DeliveryOrder[]> {
    if (!USE_API) return mockRequest([], 300);
    const rows = await request<DeliveryOrder[]>("/deliveries/");
    return rows.map(normalize);
  },
  async create(order: Omit<DeliveryOrder, "id" | "createdAt" | "assignedAt" | "pickedUpAt" | "deliveredAt">): Promise<DeliveryOrder> {
    if (!USE_API) {
      return mockRequest({ ...order, id: `d-${Date.now()}`, createdAt: Date.now() } as DeliveryOrder, 200);
    }
    const saved = await request<DeliveryOrder>("/deliveries/", { method: "POST", body: JSON.stringify(order) });
    return normalize(saved);
  },
  async update(id: string, patch: Partial<DeliveryOrder>): Promise<DeliveryOrder> {
    if (!USE_API) return mockRequest({ id, ...patch } as DeliveryOrder, 150);
    const saved = await request<DeliveryOrder>(`/deliveries/${id}/`, { method: "PATCH", body: JSON.stringify(patch) });
    return normalize(saved);
  },
  async setStatus(id: string, status: DeliveryStatus): Promise<DeliveryOrder> {
    return deliveryService.update(id, { status });
  },
  async remove(id: string): Promise<void> {
    if (USE_API) await request<void>(`/deliveries/${id}/`, { method: "DELETE" });
  },
};
