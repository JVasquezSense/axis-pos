import { create } from "zustand";
import { USE_API } from "@/services/http";
import { reservationsService } from "@/services/reservations.service";

export type ReservationStatus = "pending" | "confirmed" | "arrived" | "cancelled";

export interface Reservation {
  id: string;
  name: string;
  phone: string;
  tableNumber: number;
  date: string;
  time: string;
  guests: number;
  notes: string;
  status: ReservationStatus;
}

interface ReservationsState {
  reservations: Reservation[];
  load: () => Promise<void>;
  add: (r: Omit<Reservation, "id">) => void;
  update: (r: Reservation) => void;
  remove: (id: string) => void;
  setStatus: (id: string, status: ReservationStatus) => void;
}

function uid() {
  return `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const useReservationsStore = create<ReservationsState>()((set) => ({
  reservations: [],

  load: async () => {
    if (!USE_API) return;
    const reservations = await reservationsService.getAll();
    set({ reservations });
  },

  add: (r) => {
    const newRes = { ...r, id: uid() };
    set((s) => ({ reservations: [newRes, ...s.reservations] }));
    if (USE_API) reservationsService.create(r).then((saved) =>
      set((s) => ({ reservations: s.reservations.map((x) => (x.id === newRes.id ? saved : x)) }))
    ).catch(console.error);
  },

  update: (r) => {
    set((s) => ({ reservations: s.reservations.map((x) => (x.id === r.id ? r : x)) }));
    if (USE_API) reservationsService.update(r).catch(console.error);
  },

  remove: (id) => {
    set((s) => ({ reservations: s.reservations.filter((r) => r.id !== id) }));
    if (USE_API) reservationsService.remove(id).catch(console.error);
  },

  setStatus: (id, status) => {
    set((s) => ({ reservations: s.reservations.map((r) => (r.id === id ? { ...r, status } : r)) }));
    if (USE_API) reservationsService.setStatus(id, status).catch(console.error);
  },
}));

export const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string }> = {
  pending:   { label: "Pendiente",  color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  confirmed: { label: "Confirmada", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  arrived:   { label: "Llegó",      color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  cancelled: { label: "Cancelada",  color: "bg-muted text-muted-foreground border-border" },
};
