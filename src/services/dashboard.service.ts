import type { DashboardData } from "@/types";
import { DASHBOARD } from "@/mock/datasets";
import { mockRequest } from "./http";

export const dashboardService = {
  /** GET /api/v1/dashboard/summary/ */
  async getSummary(): Promise<DashboardData> {
    return mockRequest(DASHBOARD, 700);
  },
};
