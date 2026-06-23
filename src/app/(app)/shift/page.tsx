"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TimerOff, DollarSign, CreditCard, Banknote, Users, TrendingUp, RotateCcw, Printer } from "lucide-react";
import { useSalesStore, liveDayTotals } from "@/store/sales.store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { cn, formatCurrency } from "@/lib/utils";
import { PAYMENT_LABEL } from "@/lib/payments";

export default function ShiftPage() {
  const records = useSalesStore((s) => s.records);
  const reset = useSalesStore((s) => s.reset);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const stats = useMemo(() => {
    const byMethod: Record<string, number> = {};
    const byWaiter: Record<string, number> = {};
    let totalTips = 0;

    records.forEach((r) => {
      byMethod[r.method] = (byMethod[r.method] ?? 0) + (r.total - (r.tip ?? 0));
      if (r.tip) {
        totalTips += r.tip;
        const w = r.waiter || "Sin asignar";
        byWaiter[w] = (byWaiter[w] ?? 0) + r.tip;
      }
    });

    const { sales, orders, avg } = liveDayTotals(records);
    return { sales, orders, avg, totalTips, byMethod, byWaiter };
  }, [records]);

  const closeShift = () => {
    reset();
    setConfirmOpen(false);
    toast.success("Turno cerrado", { description: "Registros del turno eliminados. Nueva sesión lista." });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cierre de turno"
        description="Cuadre de caja, propinas por mesero y cierre de sesión"
        icon={<TimerOff className="h-5 w-5" />}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setConfirmOpen(true)} disabled={records.length === 0}>
              <TimerOff className="h-4 w-4" /> Cerrar turno
            </Button>
          </div>
        }
      />

      {records.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent>
            <p className="text-muted-foreground">No hay ventas registradas en este turno.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <KpiCard icon={DollarSign} tone="text-emerald-500" label="Ventas del turno" value={formatCurrency(stats.sales)} />
            <KpiCard icon={CreditCard} tone="text-primary" label="Transacciones" value={`${records.length}`} />
            <KpiCard icon={TrendingUp} tone="text-amber-500" label="Ticket promedio" value={formatCurrency(stats.avg)} />
            <KpiCard icon={Users} tone="text-violet-500" label="Total propinas" value={formatCurrency(stats.totalTips)} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Cuadre por método */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Banknote className="h-4 w-4" /> Cuadre por método de pago</CardTitle></CardHeader>
              <CardContent className="space-y-2 print-area">
                {Object.entries(stats.byMethod).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                    <span className="text-sm font-medium">{PAYMENT_LABEL[method as keyof typeof PAYMENT_LABEL] ?? method}</span>
                    <span className="text-sm font-bold">{formatCurrency(amount)}</span>
                  </div>
                ))}
                <Separator className="my-2" />
                <div className="flex items-center justify-between px-4 py-1">
                  <span className="font-semibold">Total (sin propinas)</span>
                  <span className="text-lg font-bold text-primary">{formatCurrency(stats.sales - stats.totalTips)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Propinas por mesero */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Propinas por mesero</CardTitle></CardHeader>
              <CardContent className="print-area">
                {Object.keys(stats.byWaiter).length === 0 ? (
                  <p className="py-4 text-center text-sm text-muted-foreground">Sin propinas registradas en este turno.</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(stats.byWaiter)
                      .sort(([, a], [, b]) => b - a)
                      .map(([waiter, tip]) => (
                        <div key={waiter} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {waiter[0]?.toUpperCase() ?? "?"}
                            </div>
                            <span className="text-sm font-medium">{waiter}</span>
                          </div>
                          <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                            {formatCurrency(tip)}
                          </Badge>
                        </div>
                      ))}
                    <Separator className="my-2" />
                    <div className="flex items-center justify-between px-4 py-1">
                      <span className="font-semibold">Total propinas</span>
                      <span className="text-lg font-bold text-emerald-600">{formatCurrency(stats.totalTips)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Detalle de ventas */}
          <Card>
            <CardHeader><CardTitle>Detalle de ventas del turno</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-1.5 max-h-80 overflow-y-auto">
                {records.map((r) => (
                  <div key={r.id} className={cn("flex items-center gap-4 rounded-lg border border-border px-4 py-2.5 text-sm")}>
                    <span className="w-20 shrink-0 font-mono text-xs text-muted-foreground">{r.id.slice(-6).toUpperCase()}</span>
                    <span className="flex-1 truncate">{r.saleType}{r.table ? ` · Mesa ${r.table}` : ""}</span>
                    {r.waiter && r.waiter !== "Sin asignar" && (
                      <span className="text-xs text-muted-foreground">{r.waiter}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{PAYMENT_LABEL[r.method] ?? r.method}</span>
                    {(r.tip ?? 0) > 0 && (
                      <span className="text-xs text-emerald-600">+{formatCurrency(r.tip ?? 0)} propina</span>
                    )}
                    <span className="shrink-0 font-semibold">{formatCurrency(r.total)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cerrar turno</DialogTitle>
            <DialogDescription>
              Se registrarán <strong>{records.length} ventas</strong> por <strong>{formatCurrency(stats.sales)}</strong> y se limpiará el historial del turno. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={closeShift}>
              <RotateCcw className="h-4 w-4" /> Confirmar cierre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-muted", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
