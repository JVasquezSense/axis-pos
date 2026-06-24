import type { Reservation, ReservationStatus } from "@/store/reservations.store";
import { USE_API, request, mockRequest } from "./http";

export const reservationsService = {
  async getAll(): Promise<Reservation[]> {
    return USE_API ? request<Reservation[]>("/reservations/") : mockRequest([], 400);
  },
  async create(r: Omit<Reservation, "id">): Promise<Reservation> {
    return USE_API
      ? request<Reservation>("/reservations/", { method: "POST", body: JSON.stringify(r) })
      : mockRequest({ ...r, id: `res-${Date.now()}` } as Reservation, 200);
  },
  async update(r: Reservation): Promise<Reservation> {
    return USE_API
      ? request<Reservation>(`/reservations/${r.id}/`, { method: "PATCH", body: JSON.stringify(r) })
      : mockRequest(r, 200);
  },
  async remove(id: string): Promise<void> {
    if (USE_API) await request<void>(`/reservations/${id}/`, { method: "DELETE" });
  },
  async setStatus(id: string, status: ReservationStatus): Promise<Reservation> {
    return USE_API
      ? request<Reservation>(`/reservations/${id}/`, { method: "PATCH", body: JSON.stringify({ status }) })
      : mockRequest({ id, status } as unknown as Reservation, 200);
  },
};
