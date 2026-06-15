import type { Tenant, SaasMetrics } from "@/types";
import { TENANTS, SAAS_METRICS } from "@/mock/datasets";
import { mockRequest } from "./http";

export const saasService = {
  /** GET /api/v1/admin/tenants/ */
  async getTenants(): Promise<Tenant[]> {
    return mockRequest(TENANTS, 650);
  },
  /** GET /api/v1/admin/metrics/ */
  async getMetrics(): Promise<SaasMetrics> {
    return mockRequest(SAAS_METRICS, 700);
  },
};
