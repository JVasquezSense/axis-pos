"use client";

import { BarChart3, Download, Calendar } from "lucide-react";
import { reportsService } from "@/services/reports.service";
import { useAsync } from "@/hooks/use-async";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RevenueLineChart, ProfitBarChart, DonutChart } from "@/components/reports/charts";

export default function ReportsPage() {
  const { data, loading } = useAsync(() => reportsService.getExecutive());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes ejecutivos"
        description="Análisis de rentabilidad · Junio 2026"
        icon={<BarChart3 className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm">
              <Calendar className="h-4 w-4" /> Mes actual
            </Button>
            <Button size="sm">
              <Download className="h-4 w-4" /> PDF
            </Button>
          </>
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
        </>
      )}
    </div>
  );
}
