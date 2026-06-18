"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Info } from "lucide-react";
import * as Icons from "lucide-react";
import type { Kpi } from "@/types";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Sparkline } from "./sparkline";
import { AnimatedNumber } from "./animated-number";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

function formatValue(kpi: Kpi, n: number): string {
  if (kpi.format === "currency") return formatCurrency(n);
  if (kpi.format === "percent") return `${n.toFixed(1)}%`;
  return formatNumber(Math.round(n));
}

export function KpiCard({ kpi, index = 0 }: { kpi: Kpi; index?: number }) {
  const Icon = (Icons[kpi.icon as keyof typeof Icons] ?? Icons.Activity) as React.ElementType;
  const positive = kpi.delta >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: "easeOut" }}
    >
      <Card className="group relative overflow-hidden p-5 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold",
              positive ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive"
            )}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(kpi.delta)}%
          </span>
        </div>
        <div className="mt-4">
          <div className="flex items-center gap-1.5">
            <p className="text-sm text-muted-foreground">{kpi.label}</p>
            {kpi.info && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-muted-foreground/60 transition-colors hover:text-foreground" aria-label="Cómo se calcula">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs text-pretty leading-relaxed">{kpi.info}</TooltipContent>
              </Tooltip>
            )}
          </div>
          <p className="mt-1 text-2xl font-bold tracking-tight">
            <AnimatedNumber value={kpi.value} format={(n) => formatValue(kpi, n)} />
          </p>
        </div>
        {kpi.spark.length > 1 && (
          <div className="pointer-events-none mt-3 h-8 w-full opacity-80">
            <Sparkline data={kpi.spark} className="h-8 w-full" stroke={positive ? "hsl(var(--success))" : "hsl(var(--destructive))"} />
          </div>
        )}
      </Card>
    </motion.div>
  );
}
