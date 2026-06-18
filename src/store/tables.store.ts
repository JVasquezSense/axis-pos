import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RestaurantTable } from "@/types";
import { TABLES } from "@/mock/tables";

interface TablesState {
  tables: RestaurantTable[];
  addTable: (t: RestaurantTable) => void;
  moveOccupancy: (sourceId: string, targetId: string) => void;
  mergeTables: (sourceId: string, targetId: string) => void;
  /** Marca una mesa como ocupada (al tomar un pedido). */
  occupy: (number: number, waiter?: string) => void;
  /** Libera una mesa (al cobrar). */
  free: (number: number) => void;
}

export const useTablesStore = create<TablesState>()(
  persist(
    (set) => ({
      tables: structuredClone(TABLES),

      addTable: (t) => set((s) => ({ tables: [...s.tables, t] })),

      moveOccupancy: (sourceId, targetId) =>
        set((s) => {
          const src = s.tables.find((t) => t.id === sourceId);
          if (!src) return s;
          return {
            tables: s.tables.map((t) => {
              if (t.id === targetId)
                return { ...t, status: src.status, guests: src.guests, waiter: src.waiter, seatedAt: src.seatedAt, orderTotal: src.orderTotal };
              if (t.id === sourceId)
                return { ...t, status: "available" as const, guests: undefined, waiter: undefined, seatedAt: undefined, orderTotal: undefined };
              return t;
            }),
          };
        }),

      mergeTables: (sourceId, targetId) =>
        set((s) => {
          const src = s.tables.find((t) => t.id === sourceId);
          const tgt = s.tables.find((t) => t.id === targetId);
          if (!src || !tgt) return s;
          return {
            tables: s.tables.map((t) => {
              if (t.id === sourceId)
                return {
                  ...t,
                  status: "occupied" as const,
                  guests: (src.guests ?? 0) + (tgt.guests ?? 0),
                  orderTotal: (src.orderTotal ?? 0) + (tgt.orderTotal ?? 0),
                  waiter: src.waiter ?? tgt.waiter,
                  seatedAt: src.seatedAt ?? tgt.seatedAt,
                };
              if (t.id === targetId)
                return { ...t, status: "available" as const, guests: undefined, waiter: undefined, seatedAt: undefined, orderTotal: undefined };
              return t;
            }),
          };
        }),

      occupy: (number, waiter) =>
        set((s) => ({
          tables: s.tables.map((t) =>
            t.number === number && t.status !== "occupied"
              ? { ...t, status: "occupied", seatedAt: t.seatedAt ?? new Date().toISOString(), waiter: t.waiter ?? waiter }
              : t
          ),
        })),

      free: (number) =>
        set((s) => ({
          tables: s.tables.map((t) =>
            t.number === number
              ? { ...t, status: "available", guests: undefined, waiter: undefined, seatedAt: undefined, orderTotal: undefined }
              : t
          ),
        })),
    }),
    { name: "axis-tables", version: 1 }
  )
);
