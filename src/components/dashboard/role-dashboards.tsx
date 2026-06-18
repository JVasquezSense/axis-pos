"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Armchair,
  ClipboardList,
  CreditCard,
  ChefHat,
  Clock,
  AlertTriangle,
  Receipt,
  Users,
  Boxes,
  BookOpen,
  Flame,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { inventoryService } from "@/services/inventory.service";
import { dashboardService } from "@/services/dashboard.service";
import { useKitchenStore } from "@/store/kitchen.store";
import { useTablesStore } from "@/store/tables.store";
import { useSalesStore, applyLiveKpis } from "@/store/sales.store";
import { useAsync } from "@/hooks/use-async";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { QuickActions, type QuickAction } from "@/components/dashboard/quick-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { TABLE_STATUS, STOCK_STATUS, KDS_STATUS } from "@/lib/status";
import { cn, formatCurrency, formatElapsed, minutesAgo } from "@/lib/utils";

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-muted", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}

// ===========================================================================
// MESERO
// ===========================================================================
export function WaiterDashboard() {
  const tables = useTablesStore((s) => s.tables);
  const tickets = useKitchenStore((s) => s.tickets);

  const counts = tables.reduce(
    (a, t) => ((a[t.status] = (a[t.status] ?? 0) + 1), a),
    {} as Record<string, number>
  );
  const attention = tables.filter(
    (t) => t.status === "billing" || (t.seatedAt && minutesAgo(new Date(t.seatedAt)) > 60)
  );
  const ready = tickets.filter((t) => t.status === "ready");

  const actions: QuickAction[] = [
    { label: "Tomar pedido", description: "Nueva orden", icon: "ClipboardList", href: "/orders", color: "primary", primary: true },
    { label: "Ver salón", description: "Mapa de mesas", icon: "Armchair", href: "/salon", color: "emerald" },
    { label: "Cocina", description: "Estado de órdenes", icon: "ChefHat", href: "/kitchen", color: "amber" },
    { label: "Cobrar", description: "Ir a caja", icon: "CreditCard", href: "/checkout", color: "sky" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Hola, Camila 👋" description="Tu turno en el salón · Sábado 15 de junio" icon={<Armchair className="h-5 w-5" />} />
      <QuickActions actions={actions} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Armchair} label="Mesas ocupadas" value={`${counts.occupied ?? 0}`} tone="text-primary" />
        <StatCard icon={Receipt} label="Por cobrar" value={`${counts.billing ?? 0}`} tone="text-rose-500" />
        <StatCard icon={CheckCircle2} label="Disponibles" value={`${counts.available ?? 0}`} tone="text-emerald-500" />
        <StatCard icon={Clock} label="Reservadas" value={`${counts.reserved ?? 0}`} tone="text-amber-500" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Mesas que requieren atención</CardTitle>
            <Badge variant="destructive">{attention.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {attention.length === 0 ? (
              <EmptyState icon={<CheckCircle2 />} title="Todo bajo control" description="Ninguna mesa requiere atención ahora." className="border-0" />
            ) : (
              attention.map((t) => (
                <Link key={t.id} href="/salon" className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-bold text-primary">{t.number}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Mesa {t.number} · {t.zone}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.seatedAt ? `${formatElapsed(minutesAgo(new Date(t.seatedAt)))} en mesa` : "—"}
                    </p>
                  </div>
                  <Badge variant="outline" className={TABLE_STATUS[t.status].text}>
                    {TABLE_STATUS[t.status].label}
                  </Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Listo para servir</CardTitle>
            <Badge variant="success">{ready.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {ready.length === 0 ? (
              <EmptyState icon={<ChefHat />} title="Nada listo aún" description="Las órdenes terminadas en cocina aparecerán aquí." className="border-0" />
            ) : (
              ready.map((t) => (
                <Link key={t.id} href="/kitchen" className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                    <ChefHat className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.code}{t.table ? ` · Mesa ${t.table}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{t.items.length} productos listos</p>
                  </div>
                  <Badge variant="success">Servir</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===========================================================================
// CAJERO
// ===========================================================================
export function CashierDashboard() {
  const { data, loading } = useAsync(() => dashboardService.getSummary());
  const records = useSalesStore((s) => s.records);
  const tables = useTablesStore((s) => s.tables);
  const toCollect = tables.filter((t) => t.status === "billing");

  const actions: QuickAction[] = [
    { label: "Cobrar", description: "Procesar pago", icon: "CreditCard", href: "/checkout", color: "primary", primary: true },
    { label: "Nueva venta", description: "Venta directa", icon: "Receipt", href: "/checkout", color: "sky" },
    { label: "Clientes", description: "CRM y fidelización", icon: "Users", href: "/crm", color: "violet" },
    { label: "Salón", description: "Ver mesas", icon: "Armchair", href: "/salon", color: "emerald" },
  ];

  const kpis = applyLiveKpis(data?.kpis ?? [], records).filter((k) => ["sales", "orders", "avg"].includes(k.id));

  return (
    <div className="space-y-6">
      <PageHeader title="Caja · Turno tarde" description="Resumen de cobros del día" icon={<CreditCard className="h-5 w-5" />} />
      <QuickActions actions={actions} />

      {loading || !data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {kpis.map((k, i) => <KpiCard key={k.id} kpi={k} index={i} />)}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Cuentas por cobrar</CardTitle>
            <Badge variant="warning">{toCollect.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {toCollect.length === 0 ? (
              <EmptyState icon={<Receipt />} title="Sin cuentas pendientes" description="Las mesas con cuenta pendiente aparecerán aquí." className="border-0" />
            ) : (
              toCollect.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/10 font-bold text-rose-500">{t.number}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Mesa {t.number} · {t.waiter ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{t.guests ?? 0} comensales · {t.zone}</p>
                  </div>
                  <span className="text-sm font-bold">{formatCurrency(t.orderTotal ?? 0)}</span>
                  <Button asChild size="sm">
                    <Link href="/checkout"><CreditCard className="h-4 w-4" /> Cobrar</Link>
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medios de pago · hoy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Efectivo", pct: 38, color: "bg-emerald-500" },
              { label: "Tarjeta", pct: 32, color: "bg-sky-500" },
              { label: "Nequi", pct: 18, color: "bg-fuchsia-500" },
              { label: "Daviplata", pct: 8, color: "bg-rose-500" },
              { label: "PSE", pct: 4, color: "bg-indigo-500" },
            ].map((m) => (
              <div key={m.label}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{m.label}</span>
                  <span className="font-medium text-muted-foreground">{m.pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", m.color)} style={{ width: `${m.pct}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ===========================================================================
// COCINA
// ===========================================================================
export function KitchenDashboard() {
  const tickets = useKitchenStore((s) => s.tickets);
  const { data: inventory } = useAsync(() => inventoryService.getItems());

  const pending = tickets.filter((t) => t.status === "pending");
  const preparing = tickets.filter((t) => t.status === "preparing");
  const ready = tickets.filter((t) => t.status === "ready");
  const urgent = tickets.filter((t) => t.priority || (t.status !== "ready" && minutesAgo(new Date(t.createdAt)) >= 15));
  const critical = (inventory ?? []).filter((i) => i.status !== "normal");

  const actions: QuickAction[] = [
    { label: "Abrir KDS", description: "Tablero de cocina", icon: "ChefHat", href: "/kitchen", color: "primary", primary: true },
    { label: "Recetas", description: "Fichas técnicas", icon: "BookOpen", href: "/recipes", color: "violet" },
    { label: "Inventario", description: "Insumos y stock", icon: "Boxes", href: "/inventory", color: "amber" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Cocina · KDS" description="Estado de la línea en tiempo real" icon={<ChefHat className="h-5 w-5" />} />
      <QuickActions actions={actions} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Timer} label={KDS_STATUS.pending.label} value={`${pending.length}`} tone="text-slate-500" />
        <StatCard icon={Flame} label={KDS_STATUS.preparing.label} value={`${preparing.length}`} tone="text-amber-500" />
        <StatCard icon={CheckCircle2} label={KDS_STATUS.ready.label} value={`${ready.length}`} tone="text-emerald-500" />
        <StatCard icon={AlertTriangle} label="Urgentes" value={`${urgent.length}`} tone="text-destructive" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Órdenes urgentes</CardTitle>
            <Badge variant="destructive">{urgent.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {urgent.length === 0 ? (
              <EmptyState icon={<CheckCircle2 />} title="Línea al día" description="No hay órdenes atrasadas." className="border-0" />
            ) : (
              urgent.map((t) => (
                <Link key={t.id} href="/kitchen" className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                    <Flame className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t.code}{t.table ? ` · Mesa ${t.table}` : ""}</p>
                    <p className="text-xs text-muted-foreground">{t.items.length} productos</p>
                  </div>
                  <span className="flex items-center gap-1 text-sm font-semibold text-destructive">
                    <Clock className="h-3.5 w-3.5" /> {minutesAgo(new Date(t.createdAt))}m
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Insumos críticos</CardTitle>
            <Badge variant="warning">{critical.length}</Badge>
          </CardHeader>
          <CardContent className="space-y-2">
            {critical.length === 0 ? (
              <EmptyState icon={<Boxes />} title="Stock saludable" description="No hay insumos por reponer." className="border-0" />
            ) : (
              critical.map((i) => (
                <Link key={i.id} href="/inventory" className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/50">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Boxes className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.stock} {i.unit} · mín. {i.minStock} {i.unit}</p>
                  </div>
                  <Badge variant={STOCK_STATUS[i.status].variant}>{STOCK_STATUS[i.status].label}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
