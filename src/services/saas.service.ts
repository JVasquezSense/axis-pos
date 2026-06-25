import type { Tenant, TenantFeatures, TenantUser, SaasMetrics } from "@/types";
import { TENANTS, SAAS_METRICS } from "@/mock/datasets";
import { USE_API, request, mockRequest } from "./http";

export const saasService = {
  async getTenants(): Promise<Tenant[]> {
    return USE_API ? request<Tenant[]>("/admin/tenants/") : mockRequest(TENANTS, 650);
  },
  async getMetrics(): Promise<SaasMetrics> {
    return USE_API ? request<SaasMetrics>("/admin/metrics/") : mockRequest(SAAS_METRICS, 700);
  },
  async createTenant(data: Omit<Tenant, "id" | "mrr" | "users" | "ordersMonth" | "joinedAt">): Promise<Tenant> {
    return USE_API
      ? request<Tenant>("/admin/tenants/", { method: "POST", body: JSON.stringify(data) })
      : mockRequest({ ...data, id: `t-${Date.now()}`, mrr: 0, users: 1, ordersMonth: 0, joinedAt: new Date().toISOString() } as Tenant, 300);
  },
  async updateTenant(id: string, data: Partial<Tenant>): Promise<Tenant> {
    return USE_API
      ? request<Tenant>(`/admin/tenants/${id}/`, { method: "PATCH", body: JSON.stringify(data) })
      : mockRequest(data as Tenant, 200);
  },
  async deleteTenant(id: string): Promise<void> {
    if (USE_API) await request<void>(`/admin/tenants/${id}/`, { method: "DELETE" });
  },
  async updateFeatures(id: string, features: Partial<TenantFeatures>): Promise<Tenant> {
    return USE_API
      ? request<Tenant>(`/admin/tenants/${id}/features/`, { method: "PATCH", body: JSON.stringify({ features }) })
      : mockRequest({} as Tenant, 200);
  },
  async getUsers(tenantId: string): Promise<TenantUser[]> {
    return USE_API ? request<TenantUser[]>(`/admin/tenants/${tenantId}/users/`) : mockRequest([], 300);
  },
  async createUser(tenantId: string, data: { username: string; email: string; password: string; role: string }): Promise<TenantUser> {
    return USE_API
      ? request<TenantUser>(`/admin/tenants/${tenantId}/users/`, { method: "POST", body: JSON.stringify(data) })
      : mockRequest({ id: Date.now(), ...data, is_active: true } as unknown as TenantUser, 300);
  },
  async updateUser(tenantId: string, userId: number, data: { username?: string; email?: string; password?: string; role?: string }): Promise<TenantUser> {
    return USE_API
      ? request<TenantUser>(`/admin/tenants/${tenantId}/users/${userId}/`, { method: "PATCH", body: JSON.stringify(data) })
      : mockRequest({ id: userId, ...data } as unknown as TenantUser, 200);
  },
  async deleteUser(tenantId: string, userId: number): Promise<void> {
    if (USE_API) await request<void>(`/admin/tenants/${tenantId}/users/${userId}/`, { method: "DELETE" });
  },
};
