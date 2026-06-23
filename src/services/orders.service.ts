import type { Order } from "@/types";
import { ORDERS } from "@/mock/datasets";
import { USE_API, request, mockRequest } from "./http";

export const ordersService = {
  /** GET /api/v1/orders/?status=active */
  async getActive(): Promise<Order[]> {
    return USE_API ? request<Order[]>("/orders/?status=active") : mockRequest(ORDERS, 550);
  },
};
