import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuditModule =
  | "ventas"
  | "inventario"
  | "menu"
  | "proveedores"
  | "reservaciones"
  | "mesas"
  | "empleados"
  | "sistema";

export interface AuditEntry {
  id: string;
  action: string;
  details: string;
  user: string;
  ts: number;
  module: AuditModule;
}

interface AuditState {
  entries: AuditEntry[];
  log: (entry: Omit<AuditEntry, "id" | "ts">) => void;
  clear: () => void;
}

export const MODULE_LABELS: Record<AuditModule, string> = {
  ventas: "Ventas",
  inventario: "Inventario",
  menu: "Menú",
  proveedores: "Proveedores",
  reservaciones: "Reservaciones",
  mesas: "Mesas",
  empleados: "Empleados",
  sistema: "Sistema",
};

export const MODULE_COLORS: Record<AuditModule, string> = {
  ventas: "bg-emerald-500/15 text-emerald-600",
  inventario: "bg-amber-500/15 text-amber-600",
  menu: "bg-violet-500/15 text-violet-600",
  proveedores: "bg-sky-500/15 text-sky-600",
  reservaciones: "bg-blue-500/15 text-blue-600",
  mesas: "bg-orange-500/15 text-orange-600",
  empleados: "bg-pink-500/15 text-pink-600",
  sistema: "bg-muted text-muted-foreground",
};

export const useAuditStore = create<AuditState>()(
  persist(
    (set) => ({
      entries: [],
      log: (entry) =>
        set((s) => ({
          entries: [
            { ...entry, id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, ts: Date.now() },
            ...s.entries,
          ].slice(0, 500),
        })),
      clear: () => set({ entries: [] }),
    }),
    { name: "axis-audit", version: 1 }
  )
);
