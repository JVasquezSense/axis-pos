import type { AuditEntry, AuditModule } from "@/store/audit.store";
import { USE_API, request, mockRequest } from "./http";

interface AuditPayload {
  action: string;
  details: string;
  user: string;
  module: AuditModule;
}

/** Bitácora del panel, persistida en el backend y filtrada por tenant. */
export const auditService = {
  async list(limit = 500): Promise<AuditEntry[]> {
    if (!USE_API) return mockRequest([], 300);
    const rows = await request<AuditEntry[]>(`/audit/?limit=${limit}`);
    return rows.map((r) => ({ ...r, id: String(r.id) }));
  },
  async log(entry: AuditPayload): Promise<AuditEntry> {
    if (!USE_API) return mockRequest({ ...entry, id: `a-${Date.now()}`, ts: Date.now() } as AuditEntry, 100);
    const saved = await request<AuditEntry>("/audit/", { method: "POST", body: JSON.stringify(entry) });
    return { ...saved, id: String(saved.id) };
  },
};
