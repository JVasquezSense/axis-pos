import { USE_API, request } from "./http";

/** Identidad del usuario autenticado y el restaurante (tenant) al que pertenece. */
export interface Me {
  id: number;
  username: string;
  email: string;
  isSuperuser: boolean;
  hasProfile: boolean;
  role: string | null;
  tenantId: string | null;
  tenantName: string | null;
  tenantSlug: string | null;
  tenantLogo: string | null;
  tenantPlan: string | null;
  tenantFeatures: Record<string, boolean | number> | null;
  tenantMaxUsers: number | null;
  resolvedTenantId: string | null;
}

export const meService = {
  async get(): Promise<Me | null> {
    if (!USE_API) return null;
    return request<Me>("/auth/me/");
  },
};
