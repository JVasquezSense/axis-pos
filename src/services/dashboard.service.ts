import type { DashboardData } from "@/types";
import { DASHBOARD } from "@/mock/datasets";
import { USE_API, request, mockRequest } from "./http";

export const dashboardService = {
  /** GET /api/v1/dashboard/summary/ */
  async getSummary(): Promise<DashboardData> {
    // Sin endpoint en el backend aún → siempre mock
    return mockRequest(DASHBOARD, 700);
  },
};
