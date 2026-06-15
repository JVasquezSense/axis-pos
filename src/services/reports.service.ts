import type { ReportData } from "@/types";
import { REPORTS } from "@/mock/datasets";
import { mockRequest } from "./http";

export const reportsService = {
  /** GET /api/v1/reports/executive/ */
  async getExecutive(): Promise<ReportData> {
    return mockRequest(REPORTS, 750);
  },
};
