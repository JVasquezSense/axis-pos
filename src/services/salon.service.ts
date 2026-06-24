import type { RestaurantTable } from "@/types";
import { TABLES } from "@/mock/tables";
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
};
