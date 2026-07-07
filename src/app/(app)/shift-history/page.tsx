"use client";

import { useState } from "react";
import { Clock, ChevronDown, ChevronUp, DollarSign, CreditCard, Users, TrendingUp } from "lucide-react";
import { useHistoryStore, type ShiftClose } from "@/store/history.store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";
import { PAYMENT_LABEL } from "@/lib/payments";

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function ShiftCard({ shift }: { shift: ShiftClose }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold">{fmtDate(shift.ts)}</p>
            <p className="text-xs text-muted-foreground">Cerrado a las {fmtTime(shift.ts)} por {shift.closedBy}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-bold">{formatCurrency(shift.sales)}</p>
            <p className="text-[10px] text-muted-foreground">{shift.orders} ventas</p>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MiniKpi icon={DollarSign} tone="text-emerald-500" label="Ventas" value={formatCurrency(shift.sales)} />
            <MiniKpi icon={CreditCard} tone="text-primary" label="Transacciones" value={String(shift.orders)} />
            <MiniKpi icon={TrendingUp} tone="text-amber-500" label="Ticket prom." value={formatCurrency(shift.avg)} />
            <MiniKpi icon={Users} tone="text-violet-500" label="Propinas" value={formatCurrency(shift.totalTips)} />
          </div>

          {/* Cuadre por método */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Por método de pago</p>
              <div className="space-y-1.5">
                {Object.entries(shift.byMethod).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span className="text-xs font-medium">{PAYMENT_LABEL[method as keyof typeof PAYMENT_LABEL] ?? method}</span>
                    <span className="text-xs font-bold">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Propinas por mesero */}
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Propinas por mesero</p>
              {Object.keys(shift.byWaiter).length === 0 ? (
                <p className="py-4 text-center text-xs text-muted-foreground">Sin propinas registradas</p>
              ) : (
                <div className="space-y-1.5">
                  {Object.entries(shift.byWaiter)
                    .sort(([, a], [, b]) => b - a)
                    .map(([waiter, tip]) => (
                      <div key={waiter} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                            {waiter[0]?.toUpperCase() ?? "?"}
                          </div>
                          <span className="text-xs font-medium">{waiter}</span>
                        </div>
                        <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10 text-[10px]">
                          {formatCurrency(tip)}
                        </Badge>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Detalle de ventas */}
          {shift.records.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Detalle de ventas</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {shift.records.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-1.5 text-xs">
                    <span className="w-14 shrink-0 font-mono text-muted-foreground">{r.id.slice(-6).toUpperCase()}</span>
                    <span className="flex-1 truncate">{r.saleType}{r.table ? ` · Mesa ${r.table}` : ""}</span>
                    {r.waiter && r.waiter !== "Sin asignar" && <span className="text-muted-foreground">{r.waiter}</span>}
                    <Badge variant="outline" className="text-[10px]">{PAYMENT_LABEL[r.method] ?? r.method}</Badge>
                    <span className="shrink-0 font-semibold">{formatCurrency(r.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function ShiftHistoryPage() {
  const shifts = useHistoryStore((s) => s.shifts);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de turnos"
        description="Consulta los cierres de turno anteriores"
        icon={<Clock className="h-5 w-5" />}
      />

      {shifts.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent>
            <Clock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">Sin turnos cerrados</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Los turnos aparecen aquí al cerrar desde Cierre de turno.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => (
            <ShiftCard key={shift.id} shift={shift} />
          ))}
        </div>
      )}
    </div>
  );
}

function MiniKpi({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border p-3">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-muted", tone)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-sm font-bold">{value}</p>
        <p className="text-[10px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
