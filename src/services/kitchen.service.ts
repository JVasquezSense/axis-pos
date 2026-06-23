import type { KdsTicket } from "@/types";
import { KDS_TICKETS } from "@/mock/datasets";
import { USE_API, request, mockRequest } from "./http";

export const kitchenService = {
  /** GET /api/v1/kitchen/tickets/ */
  async getTickets(): Promise<KdsTicket[]> {
    return USE_API
      ? request<KdsTicket[]>("/orders/?status=pending,preparing,ready")
      : mockRequest(KDS_TICKETS, 500);
  },

  /**
   * Suscripción en tiempo real.
   *
   * En producción se conecta a un WebSocket de Django Channels:
   *   const ws = new WebSocket(`${WS_URL}/ws/kitchen/${tenantId}/`);
   *   ws.onmessage = (e) => onTick(JSON.parse(e.data));
   *
   * Aquí simulamos eventos periódicos para la demo.
   */
  subscribe(onTick: () => void, intervalMs = 4000): () => void {
    const id = setInterval(onTick, intervalMs);
    return () => clearInterval(id);
  },
};
