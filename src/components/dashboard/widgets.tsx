"use client";

import { motion } from "framer-motion";
import { AlertTriangle, ChefHat, Info, Package, Armchair, ArrowUpRight } from "lucide-react";
import type { DashboardData, AlertItem } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatNumber, cn } from "@/lib/utils";

const SEVERITY: Record<AlertItem["severity"], { icon: React.ElementType; className: string }> = {
  critical: { icon: AlertTriangle, className: "text-destructive bg-destructive/10" },
  warning: { icon: AlertTriangle, className: "text-warning bg-warning/10" },
  info: { icon: Info, className: "text-primary bg-primary/10" },
};

export function TopProducts({ data }: { data: DashboardData["topProducts"] }) {
  const max = Math.max(...data.map((p) => p.units));
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Productos más vendidos</CardTitle>
        <Badge variant="secondary">Hoy</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {data.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-xl">
              {p.image}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="shrink-0 text-sm font-semibold">{formatCurrency(p.revenue)}</p>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Progress value={(p.units / max) * 100} className="h-1.5" />
                <span className="shrink-0 text-xs text-muted-foreground">{p.units} und</span>
              </div>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}

export function AlertsPanel({ data }: { data: AlertItem[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Alertas operativas</CardTitle>
        <Badge variant="destructive">{data.filter((a) => a.severity !== "info").length} activas</Badge>
      </CardHeader>
      <CardContent className="space-y-2">
        {data.map((a, i) => {
          const s = SEVERITY[a.severity];
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
            >
              <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", s.className)}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{a.title}</p>
                <p className="text-xs text-muted-foreground">{a.description}</p>
              </div>
              <span className="shrink-0 text-[11px] text-muted-foreground">{a.time}</span>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function LiveWidgets({ data }: { data: DashboardData }) {
  const occPct = Math.round((data.occupancy.occupied / data.occupancy.total) * 100);
  const widgets = [
    {
      icon: Armchair,
      label: "Mesas ocupadas",
      value: `${data.occupancy.occupied}/${data.occupancy.total}`,
      sub: `${occPct}% de ocupación`,
      pct: occPct,
      color: "text-emerald-500",
      bar: "bg-emerald-500",
    },
    {
      icon: ChefHat,
      label: "Pedidos en cocina",
      value: formatNumber(data.kitchenLoad.active),
      sub: `~${data.kitchenLoad.avgMinutes} min promedio`,
      pct: 65,
      color: "text-amber-500",
      bar: "bg-amber-500",
    },
    {
      icon: Package,
      label: "Inventario crítico",
      value: formatNumber(data.criticalStock),
      sub: "insumos por reponer",
      pct: 25,
      color: "text-destructive",
      bar: "bg-destructive",
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {widgets.map((w, i) => (
        <motion.div
          key={w.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06 }}
        >
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-muted", w.color)}>
                <w.icon className="h-5 w-5" />
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{w.label}</p>
            <p className="text-xl font-bold">{w.value}</p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full", w.bar)} style={{ width: `${w.pct}%` }} />
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{w.sub}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
