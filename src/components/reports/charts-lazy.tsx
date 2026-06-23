"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const fallback = () => <Skeleton className="h-[260px] w-full rounded-lg" />;

export const RevenueLineChart = dynamic(() => import("./charts").then((m) => m.RevenueLineChart), { ssr: false, loading: fallback });
export const ProfitBarChart = dynamic(() => import("./charts").then((m) => m.ProfitBarChart), { ssr: false, loading: fallback });
export const DonutChart = dynamic(() => import("./charts").then((m) => m.DonutChart), { ssr: false, loading: fallback });
export const LocationBarChart = dynamic(() => import("./charts").then((m) => m.LocationBarChart), { ssr: false, loading: fallback });
