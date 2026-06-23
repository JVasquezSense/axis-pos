import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { RestaurantTable } from "@/types";
import { TABLES } from "@/mock/tables";

interface TablesState {
  tables: RestaurantTable[];
  addTable: (t: RestaurantTable) => void;
  moveOccupancy: (sourceId: string, targetId: string) => void;
  mergeTables: (sourceId: string, targetId: string) => void;
  /** Marca una mesa como ocupada (al tomar un pedido) y acumula su consumo. */
  occupy: (number: number, total?: number, waiter?: string) => void;
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

      // Unir: la mesa destino se vincula a la principal pero SIGUE OCUPADA;
      // el consumo se suma en la principal y ambas se liberan solo al cobrar.
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
                  mergedInto: undefined,
                };
              if (t.id === targetId)
                return { ...t, status: "occupied" as const, mergedInto: src.number, orderTotal: 0 };
              return t;
            }),
          };
        }),

      occupy: (number, total, waiter) =>
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
        })),

      // Liberar: incluye todas las mesas unidas a esta (se pagan juntas)
      free: (number) =>
        set((s) => ({
          tables: s.tables.map((t) =>
            t.number === number || t.mergedInto === number
              ? { ...t, status: "available", guests: undefined, waiter: undefined, seatedAt: undefined, orderTotal: undefined, mergedInto: undefined }
              : t
          ),
        })),
    }),
    { name: "axis-tables", version: 1 }
  )
);
