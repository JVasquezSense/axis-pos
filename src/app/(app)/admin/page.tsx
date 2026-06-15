"use client";

import { ShieldCheck, Building2, Globe } from "lucide-react";
import type { Tenant } from "@/types";
import { saasService } from "@/services/saas.service";
import { useAsync } from "@/hooks/use-async";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SalesByHourChart } from "@/components/dashboard/charts";
import { DonutChart } from "@/components/reports/charts";
import { TENANT_STATUS, PLAN_LABEL } from "@/lib/status";
import { formatCurrency, formatNumber } from "@/lib/utils";

const PLAN_STYLE: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  growth: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  enterprise: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
};

export default function AdminPage() {
  const { data: metrics, loading: mLoading } = useAsync(() => saasService.getMetrics());
  const { data: tenants, loading: tLoading } = useAsync(() => saasService.getTenants());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin · SaaS"
        description="Gestión global de la plataforma multi-tenant"
        icon={<ShieldCheck className="h-5 w-5" />}
        actions={<Badge variant="success">Plataforma operativa</Badge>}
      />

      {mLoading || !metrics ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.kpis.map((kpi, i) => (
            <KpiCard key={kpi.id} kpi={kpi} index={i} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Crecimiento de MRR</CardTitle>
              <p className="text-sm text-muted-foreground">Ingreso recurrente mensual</p>
            </div>
            {metrics && <Badge variant="success">ARPA {formatCurrency(metrics.arpa)}</Badge>}
          </CardHeader>
          <CardContent>
            {metrics ? <SalesByHourChart data={metrics.mrrTrend} /> : <Skeleton className="h-[260px] w-full" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribución por plan</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics ? <DonutChart data={metrics.planMix} /> : <Skeleton className="h-[240px] w-full" />}
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Restaurantes
          </CardTitle>
          {tenants && <Badge variant="secondary">{tenants.length} cuentas</Badge>}
        </CardHeader>
        {tLoading || !tenants ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurante</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead className="text-right">Sedes</TableHead>
                <TableHead className="text-right">Usuarios</TableHead>
                <TableHead className="text-right">Pedidos/mes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t) => (
                <TenantRow key={t.id} tenant={t} />
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

function TenantRow({ tenant }: { tenant: Tenant }) {
  const status = TENANT_STATUS[tenant.status];
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-lg">{tenant.logo}</div>
          <div>
            <p className="font-medium">{tenant.name}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" /> {tenant.city} · desde {tenant.joinedAt}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${PLAN_STYLE[tenant.plan]}`}>
          {PLAN_LABEL[tenant.plan]}
        </span>
      </TableCell>
      <TableCell>
        <Badge variant={status.variant}>{status.label}</Badge>
      </TableCell>
      <TableCell className="text-right font-semibold">{formatCurrency(tenant.mrr)}</TableCell>
      <TableCell className="text-right">{tenant.locations}</TableCell>
      <TableCell className="text-right">{tenant.users}</TableCell>
      <TableCell className="text-right">{formatNumber(tenant.ordersMonth)}</TableCell>
    </TableRow>
  );
}
