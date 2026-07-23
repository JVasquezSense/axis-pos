import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PaymentMethod } from "@/types";
import { USE_API } from "@/services/http";
import { salesService } from "@/services/sales.service";

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
  invoiceNumber?: string;
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
  loading: boolean;
  loaded: boolean;
  /** Trae todas las ventas reales del backend y las fusiona con las locales. */
  load: () => Promise<void>;
  archiveSales: (records: ArchivedSale[]) => void;
  closeShift: (shift: Omit<ShiftClose, "id" | "ts">) => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      sales: [],
      shifts: [],
      loading: false,
      loaded: false,

      load: async () => {
        if (!USE_API || get().loading) return;
        set({ loading: true });
        try {
          const remote = await salesService.getAll();
          // Fusiona: las ventas del backend son la fuente de verdad; conserva las
          // archivadas localmente cuyo id no esté ya en el backend.
          const remoteIds = new Set(remote.map((r) => r.id));
          const localOnly = get().sales.filter((s) => !remoteIds.has(s.id));
          const merged = [...remote, ...localOnly].sort((a, b) => b.ts - a.ts).slice(0, 2000);
          set({ sales: merged, loading: false, loaded: true });
        } catch {
          set({ loading: false, loaded: true });
        }
      },

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
    { name: "axis-history", partialize: (s) => ({ sales: s.sales, shifts: s.shifts }) }
  )
);
