import { create } from "zustand";
import type { KdsTicket, KdsStatus, OrderChannel, OrderLine } from "@/types";
import { USE_API, apiErrorHandler } from "@/services/http";
import { kitchenService } from "@/services/kitchen.service";
import { ordersService } from "@/services/orders.service";

const NEXT: Record<KdsStatus, KdsStatus> = { pending: "preparing", preparing: "ready", ready: "ready" };

interface KitchenState {
  tickets: KdsTicket[];
  seq: number;
  wsConnected: boolean;
  load: () => Promise<void>;
  connect: (tenantId: string) => () => void;
  addFromOrder: (lines: OrderLine[], table: number | null, channel: OrderChannel) => KdsTicket;
  addWebTicket: (input: { code: string; items: { name: string; quantity: number }[]; customer?: string }) => void;
  advance: (id: string) => void;
  toggleItem: (id: string, index: number) => void;
  /** Backlog #5: editar cantidad de un item del ticket desde el KDS. */
  setItemQty: (id: string, index: number, quantity: number) => void;
  /** Backlog #5: eliminar un item del ticket desde el KDS. */
  removeItem: (id: string, index: number) => void;
}

export const useKitchenStore = create<KitchenState>()((set, get) => ({
  tickets: [],
  seq: 1100,
  wsConnected: false,

  load: async () => {
    if (!USE_API) return;
    const tickets = await kitchenService.getTickets();
    set({ tickets });
  },

  connect: (tenantId) => {
    if (!USE_API) return () => {};
    return kitchenService.subscribeWS(tenantId, {
      onNew: (ticket) =>
        set((s) => (s.tickets.some((t) => t.id === ticket.id) ? s : { tickets: [ticket, ...s.tickets] })),
      onUpdate: (ticket) =>
        set((s) => ({ tickets: s.tickets.map((t) => (t.id === ticket.id ? ticket : t)) })),
      onOpen: () => set({ wsConnected: true }),
      onClose: () => set({ wsConnected: false }),
    });
  },

  // Solo se usa en modo mock (USE_API=false); en modo API el ticket llega
  // por el POST /orders/ + el eco del WebSocket (ver order.store.sendToKitchen).
  addFromOrder: (lines, table, channel) => {
    const code = `#${get().seq}`;
    const items = lines.map((l) => ({
      name: l.product.name,
      quantity: l.quantity,
      notes: [...l.modifiers.map((m) => m.name), l.notes].filter(Boolean).join(" · ") || undefined,
    }));
    const ticket: KdsTicket = {
      id: `kds-${Date.now()}`,
      code,
      table: table ?? undefined,
      channel,
      status: "pending",
      createdAt: new Date().toISOString(),
      items,
      priority: false,
    };
    set((s) => ({ tickets: [ticket, ...s.tickets], seq: s.seq + 1 }));
    return ticket;
  },

  addWebTicket: ({ code, items }) =>
    set((s) => ({
      tickets: [
        {
          id: `kds-web-${Date.now()}`,
          code,
          channel: "web" as OrderChannel,
          status: "pending" as KdsStatus,
          createdAt: new Date().toISOString(),
          items,
          priority: false,
        },
        ...s.tickets,
      ],
    })),

  advance: (id) => {
    const t = get().tickets.find((x) => x.id === id);
    if (!t) return;
    const next = NEXT[t.status];
    set((s) => ({
      tickets: s.tickets.map((x) =>
        x.id === id ? { ...x, status: next, items: next === "ready" ? x.items.map((i) => ({ ...i, done: true })) : x.items } : x
      ),
    }));
    // Los tickets con id numérico vienen de un Order real en el backend.
    if (USE_API && /^\d+$/.test(id)) {
      ordersService.updateStatus(id, next).catch(apiErrorHandler("estado del pedido"));
    }
  },

  toggleItem: (id, index) =>
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t.id === id ? { ...t, items: t.items.map((it, i) => (i === index ? { ...it, done: !it.done } : it)) } : t
      ),
    })),

  setItemQty: (id, index, quantity) => {
    if (quantity < 1) return;
    const ticket = get().tickets.find((t) => t.id === id);
    if (!ticket) return;
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t.id === id ? { ...t, items: t.items.map((it, i) => (i === index ? { ...it, quantity } : it)) } : t
      ),
    }));
    persistTicketLines(ticket.id);
  },

  removeItem: (id, index) => {
    const ticket = get().tickets.find((t) => t.id === id);
    if (!ticket) return;
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t.id === id ? { ...t, items: t.items.filter((_, i) => i !== index) } : t
      ),
    }));
    persistTicketLines(ticket.id);
  },
}));

/**
 * Persiste las líneas actuales de un ticket al backend (PATCH /orders/{id}/).
 * Solo aplica a tickets reales (id numérico). Se usa tras editar/eliminar items
 * del KDS (backlog #5). Filtra items que no tengan productId (mock/web).
 */
function persistTicketLines(id: string) {
  if (!USE_API || !/^\d+$/.test(id)) return;
  const ticket = useKitchenStore.getState().tickets.find((t) => t.id === id);
  if (!ticket) return;
  const lines = ticket.items
    .filter((it) => it.productId != null && it.unitPrice != null)
    .map((it) => ({
      productId: Number(it.productId),
      quantity: it.quantity,
      unitPrice: Number(it.unitPrice),
      notes: it.notes,
    }));
  ordersService.updateLines(id, lines).catch(apiErrorHandler("editar pedido"));
}
