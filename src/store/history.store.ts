import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PaymentMethod } from "@/types";

export interface ArchivedSale {
  id: string;
  total: number;
  items: number;
  method: PaymentMethod;
  saleType: string;
  table: number | null;
  tip: number;
  waiter: string;
  ts: number;
}

export interface ShiftClose {
  id: string;
  ts: number;
  sales: number;
  orders: number;
  avg: number;
  totalTips: number;
  byMethod: Record<string, number>;
  byWaiter: Record<string, number>;
  closedBy: string;
  records: ArchivedSale[];
}

interface HistoryState {
  sales: ArchivedSale[];
  shifts: ShiftClose[];
  archiveSales: (records: ArchivedSale[]) => void;
  closeShift: (shift: Omit<ShiftClose, "id" | "ts">) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      sales: [],
      shifts: [],

      archiveSales: (records) =>
        set((s) => ({ sales: [...records, ...s.sales].slice(0, 2000) })),

      closeShift: (shift) => {
        const entry: ShiftClose = {
          ...shift,
          id: `shift-${Date.now().toString(36)}`,
          ts: Date.now(),
        };
        set((s) => ({ shifts: [entry, ...s.shifts].slice(0, 100) }));
      },
    }),
    { name: "axis-history" }
  )
);
