"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar, Download, LayoutDashboard } from "lucide-react";
import { dashboardService } from "@/services/dashboard.service";
import { useAsync } from "@/hooks/use-async";
import { useAppStore } from "@/store/app.store";
import { exportCsv } from "@/lib/export";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SalesByHourChart, SalesByDayChart, SalesVsLastYearChart } from "@/components/dashboard/charts";
import { TopProducts, AlertsPanel, LiveWidgets } from "@/components/dashboard/widgets";
import { DashboardSkeleton } from "@/components/dashboard/skeleton";
import { QuickActions, type QuickAction } from "@/components/dashboard/quick-actions";
import { WaiterDashboard, CashierDashboard, KitchenDashboard } from "@/components/dashboard/role-dashboards";

export default function DashboardPage() {
  const role = useAppStore((s) => s.role);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Evita desajuste de hidratación: el rol vive en localStorage (persist)
  if (!mounted) return <DashboardSkeleton />;
  if (role === "waiter") return <WaiterDashboard />;
  if (role === "cashier") return <CashierDashboard />;
  if (role === "kitchen") return <KitchenDashboard />;
  return <AdminDashboard />;
}

const ADMIN_ACTIONS: QuickAction[] = [
  { label: "Tomar pedido", description: "Nueva orden", icon: "ClipboardList", href: "/orders", color: "primary", primary: true },
  { label: "Cobrar", description: "Ir a caja", icon: "CreditCard", href: "/checkout", color: "sky" },
  { label: "Inventario", description: "Stock e insumos", icon: "Boxes", href: "/inventory", color: "amber" },
  { label: "Reportes", description: "Análisis ejecutivo", icon: "BarChart3", href: "/reports", color: "violet" },
];

function AdminDashboard() {
  const { data, loading } = useAsync(() => dashboardService.getSummary());

  const exportSummary = () => {
    if (!data) return;
    exportCsv(
      "dashboard-resumen-axis",
      ["Indicador", "Valor", "Variación %"],
      [
        ...data.kpis.map((k) => [k.label, k.format === "currency" ? formatCurrency(k.value) : String(k.value), k.delta]),
        ["", "", ""],
        ["Producto más vendido", "Unidades", "Ingresos"],
        ...data.topProducts.map((p) => [p.name, p.units, Math.round(p.revenue)]),
      ]
    );
    toast.success("Resumen exportado", { description: "Dashboard · CSV (Excel)" });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Resumen operativo · Sábado 15 de junio, 2026"
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4" /> Hoy
            </Button>
            <Button size="sm" onClick={exportSummary}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </>
        }
      />

      <QuickActions actions={ADMIN_ACTIONS} />

      {loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.kpis.map((kpi, i) => (
              <KpiCard key={kpi.id} kpi={kpi} index={i} />
            ))}
          </div>

          <LiveWidgets data={data} />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Ventas por hora</CardTitle>
                  <p className="text-sm text-muted-foreground">Distribución del día actual</p>
                </div>
                <Badge variant="success">Pico 20:00</Badge>
              </CardHeader>
              <CardContent>
                <SalesByHourChart data={data.salesByHour} />
              </CardContent>
            </Card>

            <TopProducts data={data.topProducts} />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle>Ventas por día</CardTitle>
                  <p className="text-sm text-muted-foreground">Últimos 7 días vs. semana anterior</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-primary" /> Esta semana
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Anterior
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <SalesByDayChart data={data.salesByDay} />
              </CardContent>
            </Card>

            <AlertsPanel data={data.alerts} />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Ventas vs. año pasado</CardTitle>
                <p className="text-sm text-muted-foreground">Comparativo mensual 2026 vs 2025</p>
              </div>
              <Badge variant="success">+22% acumulado</Badge>
            </CardHeader>
            <CardContent>
              <SalesVsLastYearChart data={data.salesVsLastYear} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
