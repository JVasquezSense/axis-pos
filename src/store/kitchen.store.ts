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
}));
