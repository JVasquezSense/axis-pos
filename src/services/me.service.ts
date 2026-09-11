import { USE_API, request } from "./http";

/** Identidad del usuario autenticado y el restaurante (tenant) al que pertenece. */
export interface Me {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
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

/** Configuración del propio restaurante: identidad, datos fiscales y plan. */
export interface TenantSettings {
  name: string;
  slug: string;
  logo: string;
  city: string;
  address: string;
  phone: string;
  taxId: string;
  legalName: string;
  resolution: string;
  invoicePrefix: string;
  invoiceSeq: number;
  plan: string;
  planName: string;
  planPrice: number;
  status: string;
  maxUsers: number;
  users: number;
  features: Record<string, boolean | number>;
  createdAt: string;
}

export type TenantSettingsPatch = Partial<
  Pick<TenantSettings, "name" | "logo" | "city" | "address" | "phone" | "taxId" | "legalName" | "resolution" | "invoicePrefix">
>;

const DEMO_SETTINGS: TenantSettings = {
  name: "Demo Burger", slug: "demo-burger", logo: "🍔", city: "Bogotá", address: "", phone: "",
  taxId: "", legalName: "", resolution: "", invoicePrefix: "FV", invoiceSeq: 0,
  plan: "growth", planName: "Pro", planPrice: 0, status: "trial", maxUsers: 8, users: 1,
  features: {}, createdAt: new Date().toISOString(),
};

export const meService = {
  async get(): Promise<Me | null> {
    if (!USE_API) return null;
    return request<Me>("/auth/me/");
  },
  async updateProfile(patch: { firstName?: string; lastName?: string; email?: string }): Promise<void> {
    if (!USE_API) return;
    await request("/auth/me/profile/", { method: "PATCH", body: JSON.stringify(patch) });
  },
  async changePassword(current: string, next: string): Promise<void> {
    if (!USE_API) return;
    await request("/auth/change-password/", { method: "POST", body: JSON.stringify({ current, new: next }) });
  },
  async getSettings(): Promise<TenantSettings> {
    if (!USE_API) return DEMO_SETTINGS;
    return request<TenantSettings>("/tenant/settings/");
  },
  async updateSettings(patch: TenantSettingsPatch): Promise<TenantSettings> {
    if (!USE_API) return { ...DEMO_SETTINGS, ...patch };
    return request<TenantSettings>("/tenant/settings/", { method: "PATCH", body: JSON.stringify(patch) });
  },
};
