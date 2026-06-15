import type { Order } from "@/types";
import { ORDERS } from "@/mock/datasets";
import { mockRequest } from "./http";

export const ordersService = {
  /** GET /api/v1/orders/?status=active */
  async getActive(): Promise<Order[]> {
    return mockRequest(ORDERS, 550);
  },
};
