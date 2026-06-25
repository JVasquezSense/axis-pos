import { create } from "zustand";
import type { RestaurantTable, SalonZone } from "@/types";
import { TABLES, DEFAULT_ZONES } from "@/mock/tables";
import { USE_API } from "@/services/http";
import { salonService } from "@/services/salon.service";

interface TablesState {
  tables: RestaurantTable[];
  zones: SalonZone[];
  load: () => Promise<void>;
  addTable: (t: RestaurantTable) => void;
  repositionTable: (id: string, x: number, y: number) => void;
  moveOccupancy: (sourceId: string, targetId: string) => void;
  mergeTables: (sourceId: string, targetId: string) => void;
  occupy: (number: number, total?: number, waiter?: string) => void;
  free: (number: number) => void;
  addZone: (zone: SalonZone) => void;
  updateZone: (zone: SalonZone) => void;
  removeZone: (id: string) => void;
}

export const useTablesStore = create<TablesState>()((set, get) => ({
  tables: USE_API ? [] : structuredClone(TABLES),
  zones: structuredClone(DEFAULT_ZONES),

  load: async () => {
    if (!USE_API) return;
    const tables = await salonService.getTables();
    set({ tables });
  },

  addTable: (t) => {
    set((s) => ({ tables: [...s.tables, t] }));
    if (USE_API) salonService.createTable(t).then((saved) =>
      set((s) => ({ tables: s.tables.map((x) => (x.id === t.id ? saved : x)) }))
    ).catch(console.error);
  },

  repositionTable: (id, x, y) =>
    set((s) => ({
      tables: s.tables.map((t) =>
        t.id === id ? { ...t, x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 } : t
      ),
    })),

  addZone: (zone) =>
    set((s) => ({
      zones: [...s.zones, zone].sort((a, b) => a.yStart - b.yStart),
    })),

  updateZone: (zone) =>
    set((s) => ({
      zones: s.zones.map((z) => (z.id === zone.id ? zone : z)).sort((a, b) => a.yStart - b.yStart),
    })),

  removeZone: (id) =>
    set((s) => ({ zones: s.zones.filter((z) => z.id !== id) })),

  moveOccupancy: (sourceId, targetId) =>
    set((s) => {
      const src = s.tables.find((t) => t.id === sourceId);
      if (!src) return s;
      const next = s.tables.map((t) => {
        if (t.id === targetId)
          return { ...t, status: src.status, guests: src.guests, waiter: src.waiter, seatedAt: src.seatedAt, orderTotal: src.orderTotal };
        if (t.id === sourceId)
          return { ...t, status: "available" as const, guests: undefined, waiter: undefined, seatedAt: undefined, orderTotal: undefined };
        return t;
      });
      if (USE_API) {
        const tgt = next.find((t) => t.id === targetId);
        const srcNew = next.find((t) => t.id === sourceId);
        if (tgt) salonService.updateTable({ id: tgt.id, status: tgt.status, waiter: tgt.waiter ?? "" }).catch(console.error);
        if (srcNew) salonService.updateTable({ id: srcNew.id, status: "available" }).catch(console.error);
      }
      return { tables: next };
    }),

  mergeTables: (sourceId, targetId) =>
    set((s) => {
      const src = s.tables.find((t) => t.id === sourceId);
      const tgt = s.tables.find((t) => t.id === targetId);
      if (!src || !tgt) return s;
      const next = s.tables.map((t) => {
        if (t.id === sourceId)
          return {
            ...t,
            status: "occupied" as const,
            guests: (src.guests ?? 0) + (tgt.guests ?? 0),
            orderTotal: (src.orderTotal ?? 0) + (tgt.orderTotal ?? 0),
            waiter: src.waiter ?? tgt.waiter,
            seatedAt: src.seatedAt ?? tgt.seatedAt,
            mergedInto: undefined,
          };
        if (t.id === targetId)
          return { ...t, status: "occupied" as const, mergedInto: src.number, orderTotal: 0 };
        return t;
      });
      return { tables: next };
    }),

  occupy: (number, total, waiter) => {
    set((s) => ({
      tables: s.tables.map((t) =>
        t.number === number
          ? {
              ...t,
              status: "occupied",
              seatedAt: t.seatedAt ?? new Date().toISOString(),
              waiter: t.waiter ?? waiter,
              orderTotal: total != null ? (t.orderTotal ?? 0) + total : t.orderTotal,
            }
          : t
      ),
    }));
    if (USE_API) {
      const table = get().tables.find((t) => t.number === number);
      if (table) salonService.updateTable({ id: table.id, status: "occupied", waiter: waiter ?? "" }).catch(console.error);
    }
  },

  free: (number) => {
    set((s) => ({
      tables: s.tables.map((t) =>
        t.number === number || t.mergedInto === number
          ? { ...t, status: "available", guests: undefined, waiter: undefined, seatedAt: undefined, orderTotal: undefined, mergedInto: undefined }
          : t
      ),
    }));
    if (USE_API) {
      get().tables
        .filter((t) => t.number === number || t.mergedInto === number)
        .forEach((t) => salonService.updateTable({ id: t.id, status: "available" }).catch(console.error));
    }
  },
}));
