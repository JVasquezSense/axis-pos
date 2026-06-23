import type { RestaurantTable } from "@/types";
import { TABLES } from "@/mock/tables";
import { USE_API, request, mockRequest } from "./http";

export const salonService = {
  /** GET /api/v1/tables/ */
  async getTables(): Promise<RestaurantTable[]> {
    return USE_API ? request<RestaurantTable[]>("/tables/") : mockRequest(TABLES, 600);
  },
};
