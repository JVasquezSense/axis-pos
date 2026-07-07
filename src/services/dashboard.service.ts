import type { DashboardData } from "@/types";
import { DASHBOARD } from "@/mock/datasets";
import { USE_API, request, mockRequest } from "./http";

export const dashboardService = {
  async getSummary(): Promise<DashboardData> {
    if (!USE_API) return mockRequest(DASHBOARD, 700);
    return request<DashboardData>("/dashboard/summary/").catch(() => DASHBOARD);
  },
};
