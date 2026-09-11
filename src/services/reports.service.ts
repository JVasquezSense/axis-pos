import type { ReportData } from "@/types";
import { REPORTS } from "@/mock/datasets";
import { USE_API, request, mockRequest } from "./http";

export const reportsService = {
  /** GET /api/v1/reports/executive/ */
  async getExecutive(range?: string): Promise<ReportData> {
    return USE_API
      ? request<ReportData>(`/reports/executive/${range ? `?range=${encodeURIComponent(range)}` : ""}`)
      : mockRequest(REPORTS, 750);
  },
};
