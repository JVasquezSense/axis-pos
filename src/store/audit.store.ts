import { create } from "zustand";
import { USE_API } from "@/services/http";
import { auditService } from "@/services/audit.service";

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
  loaded: boolean;
  /** Trae la bitácora del backend (filtrada por tenant). */
  load: () => Promise<void>;
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

export const useAuditStore = create<AuditState>()((set) => ({
  entries: [],
  loaded: false,

  load: async () => {
    if (!USE_API) return;
    try {
      const entries = await auditService.list();
      set({ entries, loaded: true });
    } catch {
      set({ loaded: true }); // sin conexión: se conserva lo que haya en memoria
    }
  },

  log: (entry) => {
    // Optimista: se pinta ya y se persiste en segundo plano.
    const local: AuditEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      ts: Date.now(),
    };
    set((s) => ({ entries: [local, ...s.entries].slice(0, 500) }));
    if (!USE_API) return;
    auditService.log(entry)
      .then((saved) => set((s) => ({ entries: s.entries.map((e) => (e.id === local.id ? saved : e)) })))
      .catch(() => { /* queda solo en memoria */ });
  },

  clear: () => set({ entries: [] }),
}));
