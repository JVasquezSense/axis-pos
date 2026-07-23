import type { KdsTicket, KdsStatus, Order } from "@/types";
import { KDS_TICKETS } from "@/mock/datasets";
import { USE_API, request, mockRequest } from "./http";

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL ?? "";

function orderToTicket(o: Order): KdsTicket {
  const status: KdsStatus = o.status === "pending" || o.status === "preparing" ? o.status : "ready";
  return {
    id: String(o.id),
    code: o.code,
    table: o.tableNumber,
    channel: o.channel,
    status,
    createdAt: o.createdAt,
    items: o.lines.map((l) => ({
      name: l.product.name,
      quantity: l.quantity,
      notes: l.notes || undefined,
      done: status === "ready",
      lineId: l.id,
      productId: l.product.id,
      unitPrice: l.unitPrice,
    })),
    priority: false,
  };
}

export const kitchenService = {
  /** GET /api/v1/orders/?status=pending,preparing,ready */
  async getTickets(): Promise<KdsTicket[]> {
    if (!USE_API) return mockRequest(KDS_TICKETS, 500);
    const orders = await request<Order[]>("/orders/?status=pending,preparing,ready");
    return orders.map(orderToTicket);
  },

  /**
   * Conexión en vivo al WebSocket de Django Channels (ws/kitchen/<tenant>/).
   * Devuelve una función para cerrar la conexión.
   */
  subscribeWS(
    tenantId: string,
    handlers: { onNew: (t: KdsTicket) => void; onUpdate: (t: KdsTicket) => void; onOpen: () => void; onClose: () => void }
  ): () => void {
    if (!USE_API || !WS_BASE || !tenantId) return () => {};
    const ws = new WebSocket(`${WS_BASE}/ws/kitchen/${tenantId}/`);
    ws.onopen = () => handlers.onOpen();
    ws.onclose = () => handlers.onClose();
    ws.onerror = () => handlers.onClose();
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === "ticket.new" && data.ticket) handlers.onNew(orderToTicket(data.ticket));
        else if (data.event === "ticket.update" && data.payload) handlers.onUpdate(orderToTicket(data.payload));
      } catch { /* fragmento inválido, ignorar */ }
    };
    return () => ws.close();
  },
};
