"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ChefHat, Info, Package, Armchair, Clock, ChevronRight } from "lucide-react";
import type { DashboardData, AlertItem } from "@/types";
import { ProductImage } from "@/components/shared/product-image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTablesStore } from "@/store/tables.store";
import { useInventoryStore } from "@/store/inventory.store";
import { useKitchenStore } from "@/store/kitchen.store";
import { TABLE_STATUS, STOCK_STATUS } from "@/lib/status";
import { formatCurrency, formatNumber, formatElapsed, minutesAgo, cn } from "@/lib/utils";

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
            <ProductImage emoji={p.image} category={p.category} size="sm" className="h-10 w-10 shrink-0" />
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

type WidgetKind = "tables" | "kitchen" | "inventory";

export function LiveWidgets() {
  const [detail, setDetail] = useState<WidgetKind | null>(null);
  const tablesAll = useTablesStore((s) => s.tables);
  const tickets = useKitchenStore((s) => s.tickets);
  const inventoryItems = useInventoryStore((s) => s.items);

  const occupiedN = tablesAll.filter((t) => t.status === "occupied" || t.status === "billing").length;
  const totalTables = tablesAll.length || 1;
  const occPct = Math.round((occupiedN / totalTables) * 100);
  const activeTickets = tickets.filter((t) => t.status !== "ready");
  const avgWait = activeTickets.length
    ? Math.round(activeTickets.reduce((s, t) => s + minutesAgo(new Date(t.createdAt)), 0) / activeTickets.length)
    : 0;
  const criticalN = inventoryItems.filter((i) => i.status !== "normal").length;

  const widgets: { kind: WidgetKind; icon: React.ElementType; label: string; value: string; sub: string; pct: number; color: string; bar: string }[] = [
    {
      kind: "tables",
      icon: Armchair,
      label: "Mesas ocupadas",
      value: `${occupiedN}/${tablesAll.length}`,
      sub: `${occPct}% de ocupación`,
      pct: occPct,
      color: "text-emerald-500",
      bar: "bg-emerald-500",
    },
    {
      kind: "kitchen",
      icon: ChefHat,
      label: "Pedidos en cocina",
      value: formatNumber(activeTickets.length),
      sub: avgWait ? `~${avgWait} min promedio` : "sin órdenes activas",
      pct: Math.min(activeTickets.length * 15, 100),
      color: "text-amber-500",
      bar: "bg-amber-500",
    },
    {
      kind: "inventory",
      icon: Package,
      label: "Inventario crítico",
      value: formatNumber(criticalN),
      sub: "insumos por reponer",
      pct: Math.min(criticalN * 20, 100),
      color: "text-destructive",
      bar: "bg-destructive",
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {widgets.map((w, i) => (
          <motion.button
            key={w.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => setDetail(w.kind)}
            className="text-left"
          >
            <Card className="group p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-center justify-between">
                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg bg-muted", w.color)}>
                  <w.icon className="h-5 w-5" />
                </div>
                <span className="flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-primary">
                  Ver detalle <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">{w.label}</p>
              <p className="text-xl font-bold">{w.value}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                <div className={cn("h-full rounded-full", w.bar)} style={{ width: `${w.pct}%` }} />
              </div>
              <p className="mt-1.5 text-[11px] text-muted-foreground">{w.sub}</p>
            </Card>
          </motion.button>
        ))}
      </div>

      <WidgetDetailDialog kind={detail} onClose={() => setDetail(null)} />
    </>
  );
}

function WidgetDetailDialog({ kind, onClose }: { kind: WidgetKind | null; onClose: () => void }) {
  const tables = useTablesStore((s) => s.tables);
  const tickets = useKitchenStore((s) => s.tickets);
  const inventory = useInventoryStore((s) => s.items);

  const occupied = tables.filter((t) => t.status === "occupied" || t.status === "billing");
  const active = tickets.filter((t) => t.status !== "ready");
  const lowStock = inventory.filter((i) => i.status !== "normal");

  const config = {
    tables: { title: "Mesas ocupadas", desc: "Detalle de mesas con servicio en curso", loading: false },
    kitchen: { title: "Pedidos en cocina", desc: "Órdenes en preparación", loading: false },
    inventory: { title: "Inventario crítico", desc: "Insumos por reponer", loading: false },
  };
  const c = kind ? config[kind] : null;

  return (
    <Dialog open={!!kind} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        {c && (
          <>
            <DialogHeader>
              <DialogTitle>{c.title}</DialogTitle>
              <DialogDescription>{c.desc}</DialogDescription>
            </DialogHeader>
            <div className="scrollbar-thin max-h-[55vh] space-y-2 overflow-y-auto">
              {c.loading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
              ) : kind === "tables" ? (
                occupied.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">{t.number}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">Mesa {t.number} · {t.zone}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.waiter ?? "—"} · {t.seatedAt ? formatElapsed(minutesAgo(new Date(t.seatedAt))) : "—"} · {t.guests ?? 0} pers.
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className={TABLE_STATUS[t.status].text}>{TABLE_STATUS[t.status].label}</Badge>
                      {t.orderTotal ? <p className="mt-1 text-sm font-semibold">{formatCurrency(t.orderTotal)}</p> : null}
                    </div>
                  </div>
                ))
              ) : kind === "kitchen" ? (
                active.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                      <ChefHat className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{t.code}{t.table ? ` · Mesa ${t.table}` : ""}</p>
                      <p className="truncate text-xs text-muted-foreground">{t.items.map((it) => `${it.quantity}× ${it.name}`).join(", ")}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {minutesAgo(new Date(t.createdAt))}m
                    </span>
                  </div>
                ))
              ) : (
                lowStock.map((i) => (
                  <div key={i.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground">{i.stock} {i.unit} · mín. {i.minStock} {i.unit}</p>
                    </div>
                    <Badge variant={STOCK_STATUS[i.status].variant}>{STOCK_STATUS[i.status].label}</Badge>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
