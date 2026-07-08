"use client";

import { useEffect, useMemo, useState } from "react";
import { Bike, Phone, MapPin, Navigation, Clock, CheckCircle2, Package, ArrowRight, AlertCircle } from "lucide-react";
import { useDeliveryStore, DELIVERY_STATUS_LABEL, DELIVERY_STATUS_COLOR, type DeliveryOrder, type DeliveryStatus } from "@/store/delivery.store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";

const DRIVER_FLOW: DeliveryStatus[] = ["assigned", "picked_up", "on_the_way", "arrived", "delivered"];

function nextStatus(current: DeliveryStatus): DeliveryStatus | null {
  const idx = DRIVER_FLOW.indexOf(current);
  if (idx < 0 || idx >= DRIVER_FLOW.length - 1) return null;
  return DRIVER_FLOW[idx + 1];
}

const NEXT_LABEL: Partial<Record<DeliveryStatus, string>> = {
  assigned: "Marcar recogido",
  picked_up: "En camino",
  on_the_way: "Llegué al sitio",
  arrived: "Entregado",
};

const NEXT_ICON: Partial<Record<DeliveryStatus, React.ReactNode>> = {
  assigned: <Package className="h-4 w-4" />,
  picked_up: <Navigation className="h-4 w-4" />,
  on_the_way: <MapPin className="h-4 w-4" />,
  arrived: <CheckCircle2 className="h-4 w-4" />,
};

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

function fmtElapsed(from: number) {
  const mins = Math.round((Date.now() - from) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function DeliveryCard({ order }: { order: DeliveryOrder }) {
  const updateStatus = useDeliveryStore((s) => s.updateStatus);
  const next = nextStatus(order.status);

  return (
    <Card className="overflow-hidden">
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold text-primary">{order.code}</span>
            <Badge variant="outline" className={cn("text-[10px]", DELIVERY_STATUS_COLOR[order.status])}>
              {DELIVERY_STATUS_LABEL[order.status]}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {fmtElapsed(order.createdAt)}
          </span>
        </div>

        {/* Customer & Address */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {order.customerName[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <p className="text-sm font-medium">{order.customerName}</p>
              <p className="text-[11px] text-muted-foreground">{order.customerPhone}</p>
            </div>
            <a href={`tel:${order.customerPhone}`} className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors">
              <Phone className="h-4 w-4 text-muted-foreground" />
            </a>
          </div>
          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium">{order.address}</p>
              <p className="text-xs text-muted-foreground">{order.neighborhood}</p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="space-y-1">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span>{item.quantity}× {item.name}</span>
            </div>
          ))}
          <Separator className="my-1.5" />
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Total</span>
            <span className="font-bold">{formatCurrency(order.total)}</span>
          </div>
          {order.tip > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-600">
              <span>Propina</span>
              <span>{formatCurrency(order.tip)}</span>
            </div>
          )}
          <p className="text-[10px] text-muted-foreground">Pago: {order.paymentMethod}</p>
        </div>

        {order.notes && (
          <div className="flex items-start gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {order.notes}
          </div>
        )}

        {/* Timeline */}
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Creado {fmtTime(order.createdAt)}</span>
          {order.assignedAt && <><span>·</span><span>Asignado {fmtTime(order.assignedAt)}</span></>}
          {order.pickedUpAt && <><span>·</span><span>Recogido {fmtTime(order.pickedUpAt)}</span></>}
          {order.deliveredAt && <><span>·</span><span>Entregado {fmtTime(order.deliveredAt)}</span></>}
        </div>

        {/* Action */}
        {next && (
          <Button className="w-full" onClick={() => updateStatus(order.id, next)}>
            {NEXT_ICON[order.status]} {NEXT_LABEL[order.status]}
            <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}

        {order.status === "delivered" && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-600">
            <CheckCircle2 className="h-5 w-5" /> Entrega completada
          </div>
        )}
      </div>
    </Card>
  );
}

export default function DeliveryPage() {
  const orders = useDeliveryStore((s) => s.orders);
  const seedDemo = useDeliveryStore((s) => s.seedDemo);
  const [tab, setTab] = useState<"active" | "completed">("active");

  useEffect(() => { seedDemo(); }, [seedDemo]);

  const myOrders = useMemo(() => {
    return orders.filter((o) =>
      tab === "active"
        ? !["delivered", "cancelled"].includes(o.status) && o.driverId !== null
        : ["delivered", "cancelled"].includes(o.status)
    );
  }, [orders, tab]);

  const activeCount = useMemo(() => orders.filter((o) => !["delivered", "cancelled"].includes(o.status) && o.driverId !== null).length, [orders]);
  const todayDelivered = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return orders.filter((o) => o.status === "delivered" && o.deliveredAt && o.deliveredAt >= today.getTime()).length;
  }, [orders]);
  const todayTips = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return orders.filter((o) => o.status === "delivered" && o.deliveredAt && o.deliveredAt >= today.getTime()).reduce((s, o) => s + o.tip, 0);
  }, [orders]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi ruta"
        description="Pedidos asignados y entregas del día"
        icon={<Bike className="h-5 w-5" />}
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-primary">{activeCount}</p>
          <p className="text-xs text-muted-foreground">Activos</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{todayDelivered}</p>
          <p className="text-xs text-muted-foreground">Entregados hoy</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{formatCurrency(todayTips)}</p>
          <p className="text-xs text-muted-foreground">Propinas hoy</p>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-border p-0.5 w-fit">
        <button
          onClick={() => setTab("active")}
          className={cn("rounded-md px-4 py-1.5 text-sm font-medium transition-colors", tab === "active" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          Activos {activeCount > 0 && <span className="ml-1 rounded-full bg-white/20 px-1.5 text-xs">{activeCount}</span>}
        </button>
        <button
          onClick={() => setTab("completed")}
          className={cn("rounded-md px-4 py-1.5 text-sm font-medium transition-colors", tab === "completed" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
        >
          Completados
        </button>
      </div>

      {/* Orders */}
      {myOrders.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent>
            <Bike className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">
              {tab === "active" ? "Sin pedidos activos" : "Sin entregas completadas"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tab === "active" ? "Los pedidos aparecen aquí cuando te son asignados." : "Las entregas completadas aparecen aquí."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {myOrders.map((order) => (
            <DeliveryCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
