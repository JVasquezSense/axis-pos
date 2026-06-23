import type { Tenant, SaasMetrics } from "@/types";
import { TENANTS, SAAS_METRICS } from "@/mock/datasets";
import { USE_API, request, mockRequest } from "./http";

export const saasService = {
  /** GET /api/v1/admin/tenants/ */
  async getTenants(): Promise<Tenant[]> {
    return USE_API ? request<Tenant[]>("/admin/tenants/") : mockRequest(TENANTS, 650);
  },
  /** GET /api/v1/admin/metrics/ */
  async getMetrics(): Promise<SaasMetrics> {
    return USE_API ? request<SaasMetrics>("/admin/metrics/") : mockRequest(SAAS_METRICS, 700);
  },
};
