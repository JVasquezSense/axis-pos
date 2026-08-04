import type { RestaurantTable, SalonZone } from "@/types";
import { TABLES, DEFAULT_ZONES } from "@/mock/tables";
import { USE_API, request, mockRequest } from "./http";

export const salonService = {
  async getTables(): Promise<RestaurantTable[]> {
    return USE_API ? request<RestaurantTable[]>("/tables/") : mockRequest(TABLES, 600);
  },
  async createTable(t: RestaurantTable): Promise<RestaurantTable> {
    return USE_API
      ? request<RestaurantTable>("/tables/", { method: "POST", body: JSON.stringify(t) })
      : mockRequest(t, 200);
  },
  async updateTable(t: Partial<RestaurantTable> & { id: string }): Promise<RestaurantTable> {
    return USE_API
      ? request<RestaurantTable>(`/tables/${t.id}/`, { method: "PATCH", body: JSON.stringify(t) })
      : mockRequest(t as RestaurantTable, 200);
  },
  async deleteTable(id: string): Promise<void> {
    if (USE_API) await request<void>(`/tables/${id}/`, { method: "DELETE" });
  },

  // Zonas del salón: vivían solo en memoria, así que renombrarlas o crearlas se
  // perdía al recargar.
  async getZones(): Promise<SalonZone[]> {
    return USE_API ? request<SalonZone[]>("/salon-zones/") : mockRequest(DEFAULT_ZONES, 300);
  },
  async createZone(z: SalonZone): Promise<SalonZone> {
    return USE_API
      ? request<SalonZone>("/salon-zones/", { method: "POST", body: JSON.stringify(z) })
      : mockRequest(z, 150);
  },
  async updateZone(z: SalonZone): Promise<SalonZone> {
    return USE_API
      ? request<SalonZone>(`/salon-zones/${z.id}/`, { method: "PATCH", body: JSON.stringify(z) })
      : mockRequest(z, 150);
  },
  async deleteZone(id: string): Promise<void> {
    if (USE_API) await request<void>(`/salon-zones/${id}/`, { method: "DELETE" });
  },
};
