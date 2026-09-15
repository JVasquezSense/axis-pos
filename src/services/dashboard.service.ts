import type { DashboardData } from "@/types";
import { DASHBOARD } from "@/mock/datasets";
import { rangeQuery, type DateRange } from "@/components/shared/date-range-filter";
import { USE_API, request, mockRequest } from "./http";

export const dashboardService = {
  /** Sin rango: hoy. Con `DateRange`: periodo libre desde/hasta. */
  async getSummary(range?: DateRange): Promise<DashboardData> {
    if (!USE_API) return mockRequest(DASHBOARD, 700);
    const qs = range ? rangeQuery(range) : "range=today";
    return request<DashboardData>(`/dashboard/summary/?${qs}`).catch(() => DASHBOARD);
  },
};
