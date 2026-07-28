import type { ShiftClose } from "@/store/history.store";
import { USE_API, request, mockRequest } from "./http";

function normalize(s: ShiftClose): ShiftClose {
  return {
    ...s,
    id: String(s.id),
    sales: Number(s.sales),
    avg: Number(s.avg ?? 0),
    totalTips: Number(s.totalTips ?? 0),
  };
}

/** Cierres de turno persistidos en el backend, filtrados por tenant. */
export const shiftsService = {
  async list(): Promise<ShiftClose[]> {
    if (!USE_API) return mockRequest([], 300);
    const rows = await request<ShiftClose[]>("/shifts/");
    return rows.map(normalize);
  },
  async create(shift: Omit<ShiftClose, "id" | "ts">): Promise<ShiftClose> {
    if (!USE_API) {
      return mockRequest({ ...shift, id: `shift-${Date.now()}`, ts: Date.now() } as ShiftClose, 200);
    }
    const saved = await request<ShiftClose>("/shifts/", { method: "POST", body: JSON.stringify(shift) });
    return normalize(saved);
  },
};
