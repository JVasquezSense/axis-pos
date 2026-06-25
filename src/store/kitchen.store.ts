import { create } from "zustand";
import type { KdsTicket, KdsStatus, OrderChannel, OrderLine } from "@/types";

const NEXT: Record<KdsStatus, KdsStatus> = { pending: "preparing", preparing: "ready", ready: "ready" };

interface KitchenState {
  tickets: KdsTicket[];
  seq: number;
  addFromOrder: (lines: OrderLine[], table: number | null, channel: OrderChannel) => KdsTicket;
  addWebTicket: (input: { code: string; items: { name: string; quantity: number }[]; customer?: string }) => void;
  advance: (id: string) => void;
  toggleItem: (id: string, index: number) => void;
}

export const useKitchenStore = create<KitchenState>()((set, get) => ({
  tickets: [],
  seq: 1100,

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

  advance: (id) =>
    set((s) => ({
      tickets: s.tickets.map((t) => {
        if (t.id !== id) return t;
        const next = NEXT[t.status];
        return { ...t, status: next, items: next === "ready" ? t.items.map((i) => ({ ...i, done: true })) : t.items };
      }),
    })),

  toggleItem: (id, index) =>
    set((s) => ({
      tickets: s.tickets.map((t) =>
        t.id === id ? { ...t, items: t.items.map((it, i) => (i === index ? { ...it, done: !it.done } : it)) } : t
      ),
    })),
}));
