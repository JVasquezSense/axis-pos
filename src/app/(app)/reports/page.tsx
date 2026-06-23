"use client";

import { useState } from "react";
import { BarChart3, Download, Building2 } from "lucide-react";
import { reportsService } from "@/services/reports.service";
import { useAsync } from "@/hooks/use-async";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RevenueLineChart, ProfitBarChart, DonutChart, LocationBarChart } from "@/components/reports/charts-lazy";
import { cn, formatCurrency } from "@/lib/utils";

const DATE_RANGES = [
  { id: "today", label: "Hoy" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "year", label: "Año" },
];

export default function ReportsPage() {
  const { data, loading } = useAsync(() => reportsService.getExecutive());
  const [range, setRange] = useState("month");

  return (
    <div className="space-y-6 print-area">
      <PageHeader
        title="Reportes ejecutivos"
        description="Análisis de rentabilidad · Junio 2026"
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <div className="print-hidden flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border p-0.5">
              {DATE_RANGES.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRange(r.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    range === r.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <Button size="sm" onClick={() => window.print()}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </div>
        }
      />

      {loading || !data ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {data.kpis.map((kpi, i) => (
              <KpiCard key={kpi.id} kpi={kpi} index={i} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Evolución de ventas y utilidad</CardTitle>
              <p className="text-sm text-muted-foreground">Comparativo de los últimos 6 meses</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="combo">
                <TabsList>
                  <TabsTrigger value="combo">Ventas vs Utilidad</TabsTrigger>
                  <TabsTrigger value="profit">Solo utilidad</TabsTrigger>
                </TabsList>
                <TabsContent value="combo">
                  <RevenueLineChart revenue={data.revenueTrend} profit={data.profitTrend} />
                </TabsContent>
                <TabsContent value="profit">
                  <ProfitBarChart data={data.profitTrend} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Mix por categoría</CardTitle>
                <p className="text-sm text-muted-foreground">Participación en ventas</p>
              </CardHeader>
              <CardContent>
                <DonutChart data={data.categoryMix} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Mix por canal</CardTitle>
                <p className="text-sm text-muted-foreground">Origen de los pedidos</p>
              </CardHeader>
              <CardContent>
                <DonutChart data={data.channelMix} />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Ventas por sucursal</CardTitle>
                  <p className="text-sm text-muted-foreground">Comparadas con el promedio de sedes</p>
                </div>
                <Badge variant="secondary">{DATE_RANGES.find((r) => r.id === range)?.label}</Badge>
              </CardHeader>
              <CardContent>
                <LocationBarChart data={data.salesByLocation} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Medios de pago</CardTitle>
                <p className="text-sm text-muted-foreground">Participación por método</p>
              </CardHeader>
              <CardContent>
                <DonutChart data={data.paymentMix} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Platos vs. promedio</CardTitle>
                <p className="text-sm text-muted-foreground">Ingreso de cada plato comparado con el promedio del top</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.topDishes.map((d) => {
                const diff = Math.round(((d.revenue - d.avg) / d.avg) * 100);
                const above = d.revenue >= d.avg;
                return (
                  <div key={d.name} className="flex items-center gap-3 rounded-xl border border-border p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{d.name}</p>
                      <p className="text-xs text-muted-foreground">{d.units} unidades</p>
                    </div>
                    <span className="text-sm font-semibold">{formatCurrency(d.revenue)}</span>
                    <Badge variant={above ? "success" : "secondary"} className="w-20 justify-center">
                      {above ? "+" : ""}{diff}% vs prom.
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
