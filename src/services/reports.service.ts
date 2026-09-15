import type { ReportData } from "@/types";
import { REPORTS } from "@/mock/datasets";
import { rangeQuery, type DateRange } from "@/components/shared/date-range-filter";
import { USE_API, request, mockRequest } from "./http";

export const reportsService = {
  /** GET /api/v1/reports/executive/ */
  /** Periodo libre (desde/hasta); el servidor compara contra el tramo anterior de igual largo. */
  async getExecutive(range?: DateRange): Promise<ReportData> {
    return USE_API
      ? request<ReportData>(`/reports/executive/${range ? `?${rangeQuery(range)}` : ""}`)
      : mockRequest(REPORTS, 750);
  },
};
