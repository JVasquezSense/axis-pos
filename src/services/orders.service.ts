import type { Order, OrderLine, OrderChannel } from "@/types";
import { ORDERS } from "@/mock/datasets";
import { USE_API, request, mockRequest } from "./http";

export interface CreateOrderPayload {
  code: string;
  channel: OrderChannel;
  table?: number | null;
  customer?: string;
  phone?: string;
  lines: { productId: string; quantity: number; unitPrice: number; notes?: string }[];
}

export const ordersService = {
  async getActive(): Promise<Order[]> {
    return USE_API ? request<Order[]>("/orders/?status=pending,preparing,ready") : mockRequest(ORDERS, 550);
  },
  async createOrder(payload: CreateOrderPayload): Promise<Order> {
    return USE_API
      ? request<Order>("/orders/", { method: "POST", body: JSON.stringify(payload) })
      : mockRequest({ id: `ord-${Date.now()}`, ...payload } as unknown as Order, 300);
  },
  async updateStatus(id: string, status: string): Promise<Order> {
    return USE_API
      ? request<Order>(`/orders/${id}/`, { method: "PATCH", body: JSON.stringify({ status }) })
      : mockRequest({ id, status } as unknown as Order, 200);
  },
};
