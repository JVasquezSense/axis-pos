import type { ReportData } from "@/types";
import { REPORTS } from "@/mock/datasets";
import { USE_API, request, mockRequest } from "./http";

export const reportsService = {
  /** GET /api/v1/reports/executive/ */
  async getExecutive(): Promise<ReportData> {
    // Sin endpoint en el backend aún → siempre mock
    return mockRequest(REPORTS, 750);
  },
};
