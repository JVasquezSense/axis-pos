import type { RestaurantTable } from "@/types";
import { TABLES } from "@/mock/tables";
import { mockRequest } from "./http";

export const salonService = {
  /** GET /api/v1/tables/ */
  async getTables(): Promise<RestaurantTable[]> {
    return mockRequest(TABLES, 600);
  },
};
