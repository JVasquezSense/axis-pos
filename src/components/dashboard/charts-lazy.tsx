"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const fallback = () => <Skeleton className="h-[260px] w-full rounded-lg" />;

/** Carga diferida de Recharts: reduce el JS inicial del dashboard. */
export const SalesByHourChart = dynamic(() => import("./charts").then((m) => m.SalesByHourChart), { ssr: false, loading: fallback });
export const SalesByDayChart = dynamic(() => import("./charts").then((m) => m.SalesByDayChart), { ssr: false, loading: fallback });
export const SalesVsLastYearChart = dynamic(() => import("./charts").then((m) => m.SalesVsLastYearChart), { ssr: false, loading: fallback });
