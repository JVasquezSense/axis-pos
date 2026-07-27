import type { Order, OrderLine, OrderChannel } from "@/types";
import { ORDERS } from "@/mock/datasets";
import { USE_API, request, mockRequest } from "./http";

export interface CreateOrderPayload {
  code: string;
  channel: OrderChannel;
  table?: number | null;
  customer?: string;
  phone?: string;
  lines: { productId: number; quantity: number; unitPrice: number; notes?: string }[];
}

export const ordersService = {
  async getActive(table?: number): Promise<Order[]> {
    if (!USE_API) return mockRequest(ORDERS, 550);
    const tableParam = table != null ? `&table=${table}` : "";
    return request<Order[]>(`/orders/?status=pending,preparing,ready${tableParam}`);
  },
  /** Pedidos web reales (carta pública / QR por mesa). Filtrados por tenant en el backend. */
  async getWebOrders(): Promise<Order[]> {
    if (!USE_API) return mockRequest([], 300);
    return request<Order[]>("/orders/?channel=web&status=pending,preparing,ready,served");
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
  /** Reemplaza las líneas de una orden (ediciones del KDS / Órdenes: backlog #4, #5). */
  async updateLines(id: string, lines: { productId: number; quantity: number; unitPrice: number; notes?: string }[]): Promise<Order> {
    return USE_API
      ? request<Order>(`/orders/${id}/`, { method: "PATCH", body: JSON.stringify({ lines }) })
      : mockRequest({ id, lines: [] } as unknown as Order, 200);
  },
};
