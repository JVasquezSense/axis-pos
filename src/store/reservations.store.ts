import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ReservationStatus = "pending" | "confirmed" | "arrived" | "cancelled";

export interface Reservation {
  id: string;
  name: string;
  phone: string;
  tableNumber: number;
  date: string;   // YYYY-MM-DD
  time: string;   // HH:mm
  guests: number;
  notes: string;
  status: ReservationStatus;
}

interface ReservationsState {
  reservations: Reservation[];
  add: (r: Omit<Reservation, "id">) => void;
  update: (r: Reservation) => void;
  remove: (id: string) => void;
  setStatus: (id: string, status: ReservationStatus) => void;
}

function uid() {
  return `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const useReservationsStore = create<ReservationsState>()(
  persist(
    (set) => ({
      reservations: [],
      add: (r) => set((s) => ({ reservations: [{ ...r, id: uid() }, ...s.reservations] })),
      update: (r) => set((s) => ({ reservations: s.reservations.map((x) => (x.id === r.id ? r : x)) })),
      remove: (id) => set((s) => ({ reservations: s.reservations.filter((r) => r.id !== id) })),
      setStatus: (id, status) =>
        set((s) => ({ reservations: s.reservations.map((r) => (r.id === id ? { ...r, status } : r)) })),
    }),
    { name: "axis-reservations", version: 1 }
  )
);

export const STATUS_CONFIG: Record<ReservationStatus, { label: string; color: string }> = {
  pending:   { label: "Pendiente",  color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  confirmed: { label: "Confirmada", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  arrived:   { label: "Llegó",      color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  cancelled: { label: "Cancelada",  color: "bg-muted text-muted-foreground border-border" },
};
