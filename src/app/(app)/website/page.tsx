/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Globe,
  ExternalLink,
  Radio,
  ShoppingBag,
  Wifi,
  Phone,
  FileCheck,
  Check,
  X,
  Truck,
  ImageOff,
  Receipt,
} from "lucide-react";
import type { LiveWebOrder } from "@/store/web.store";
import { useWebStore, WEB_ORDER_STATUS } from "@/store/web.store";
import { useKitchenStore } from "@/store/kitchen.store";
import { PAYMENT_LABEL } from "@/lib/payments";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils";

export default function WebsitePage() {
  const { liveOrders, verifyOrder, dispatchOrder, rejectOrder } = useWebStore();
  const addWebTicket = useKitchenStore((s) => s.addWebTicket);
  const [viewing, setViewing] = useState<LiveWebOrder | null>(null);

  const verifyAndSend = (o: LiveWebOrder) => {
    verifyOrder(o.id);
    addWebTicket({ code: o.code, items: o.lines, customer: o.customer });
  };

  const counts = {
    review: liveOrders.filter((o) => o.status === "review").length,
    verified: liveOrders.filter((o) => o.status === "verified").length,
    dispatched: liveOrders.filter((o) => o.status === "dispatched").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Página web del restaurante"
        description="Tu e-commerce sincronizado con el POS"
        icon={<Globe className="h-5 w-5" />}
        actions={
          <Button asChild>
            <Link href="/restaurant/demo-burger" target="_blank">
              <ExternalLink className="h-4 w-4" /> Abrir sitio
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_420px]">
        {/* Preview */}
        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Vista previa del sitio</CardTitle>
            <Badge variant="success" className="gap-1.5">
              <Wifi className="h-3.5 w-3.5" /> Publicado
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-3 py-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <span className="ml-2 rounded bg-background px-2 py-0.5 text-xs text-muted-foreground">
                  axispos.co/restaurant/demo-burger
                </span>
              </div>
              <div className="relative bg-gradient-to-br from-primary/15 via-orange-500/10 to-transparent p-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-2xl">🍔</div>
                  <div>
                    <p className="text-lg font-black">Demo Burger</p>
                    <p className="text-xs text-muted-foreground">Pedidos en línea · 4.8 ★</p>
                  </div>
                </div>
                <p className="mt-4 max-w-sm text-xl font-bold">
                  Las mejores hamburguesas artesanales de la ciudad 🔥
                </p>
                <Button asChild className="mt-5">
                  <Link href="/restaurant/demo-burger" target="_blank">
                    Ver experiencia completa <ExternalLink className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat label="Por verificar" value={`${counts.review}`} tone="text-amber-500" />
              <Stat label="Verificados" value={`${counts.verified}`} tone="text-emerald-500" />
              <Stat label="Despachados" value={`${counts.dispatched}`} tone="text-primary" />
            </div>
          </CardContent>
        </Card>

        {/* Live feed con verificación de pago */}
        <Card className="flex flex-col">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-4 w-4 animate-pulse text-emerald-500" /> Pedidos web
            </CardTitle>
            <Badge variant="secondary">{liveOrders.length}</Badge>
          </CardHeader>
          <CardContent className="flex-1">
            <div className="mb-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 text-xs text-muted-foreground">
              💡 Abre el{" "}
              <Link href="/restaurant/demo-burger" target="_blank" className="font-semibold text-primary underline">
                sitio web
              </Link>{" "}
              en otra pestaña, realiza un pedido, sube el comprobante y verifícalo aquí.
            </div>
            {liveOrders.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag />}
                title="Sin pedidos web aún"
                description="Los pedidos del sitio aparecerán aquí para verificar el pago y despachar."
                className="border-0"
              />
            ) : (
              <div className="space-y-2.5">
                <AnimatePresence initial={false}>
                  {liveOrders.map((o) => (
                    <OrderRow
                      key={o.id}
                      order={o}
                      onView={() => setViewing(o)}
                      onVerify={() => {
                        verifyAndSend(o);
                        toast.success(`Pago de ${o.code} verificado`, { description: "Enviado a cocina" });
                      }}
                      onReject={() => {
                        rejectOrder(o.id);
                        toast.error(`Comprobante de ${o.code} rechazado`);
                      }}
                      onDispatch={() => {
                        dispatchOrder(o.id);
                        toast.success(`${o.code} despachado 🚚`);
                      }}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visor de comprobante */}
      <Dialog open={!!viewing} onOpenChange={(v) => !v && setViewing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Comprobante · {viewing?.code}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Info label="Cliente" value={viewing?.customer ?? "—"} />
              <Info label="Teléfono" value={viewing?.phone ?? "—"} />
              <Info label="Método" value={viewing ? PAYMENT_LABEL[viewing.method] : "—"} />
              <Info label="Total" value={viewing ? formatCurrency(viewing.total) : "—"} />
            </div>
            {viewing?.receipt ? (
              <img
                src={viewing.receipt}
                alt="Comprobante de pago"
                className="max-h-[50vh] w-full rounded-xl border border-border object-contain"
              />
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-10 text-muted-foreground">
                <ImageOff className="h-8 w-8" />
                <p className="text-sm">El cliente aún no sube el comprobante</p>
              </div>
            )}
            {viewing?.status === "review" && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    rejectOrder(viewing.id);
                    toast.error("Comprobante rechazado");
                    setViewing(null);
                  }}
                >
                  <X className="h-4 w-4" /> Rechazar
                </Button>
                <Button
                  onClick={() => {
                    verifyAndSend(viewing);
                    toast.success("Pago verificado", { description: "Enviado a cocina" });
                    setViewing(null);
                  }}
                >
                  <Check className="h-4 w-4" /> Verificar pago
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OrderRow({
  order,
  onView,
  onVerify,
  onReject,
  onDispatch,
}: {
  order: LiveWebOrder;
  onView: () => void;
  onVerify: () => void;
  onReject: () => void;
  onDispatch: () => void;
}) {
  const status = WEB_ORDER_STATUS[order.status];
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className="rounded-xl border border-border p-3"
    >
      <div className="flex items-start gap-3">
        <button
          onClick={onView}
          className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted"
          title="Ver comprobante"
        >
          {order.receipt ? (
            <img src={order.receipt} alt="" className="h-full w-full object-cover" />
          ) : (
            <Globe className="h-5 w-5 text-muted-foreground" />
          )}
          {order.status === "review" && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white">
              <FileCheck className="h-2.5 w-2.5" />
            </span>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold">{order.code}</p>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {order.customer} · {order.items} ítems · {PAYMENT_LABEL[order.method]}
          </p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Phone className="h-3 w-3" /> {order.phone}
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold">{formatCurrency(order.total)}</span>
      </div>

      {/* Acciones según estado */}
      {order.status === "awaiting_receipt" && (
        <p className="mt-2 rounded-lg bg-muted px-2.5 py-1.5 text-center text-xs text-muted-foreground">
          Esperando que el cliente suba el comprobante…
        </p>
      )}
      {order.status === "review" && (
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <Button size="sm" variant="outline" onClick={onView}>
            <Receipt className="h-4 w-4" /> Ver
          </Button>
          <Button size="sm" variant="outline" onClick={onReject}>
            <X className="h-4 w-4" /> Rechazar
          </Button>
          <Button size="sm" onClick={onVerify}>
            <Check className="h-4 w-4" /> Verificar
          </Button>
        </div>
      )}
      {order.status === "verified" && (
        <Button size="sm" variant="success" className="mt-2.5 w-full" onClick={onDispatch}>
          <Truck className="h-4 w-4" /> Despachar pedido
        </Button>
      )}
      {order.status === "dispatched" && (
        <p className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <Truck className="h-3.5 w-3.5" /> Despachado y en camino
        </p>
      )}
      {order.status === "rejected" && (
        <p className="mt-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-center text-xs font-medium text-destructive">
          Comprobante rechazado · contactar al cliente
        </p>
      )}
    </motion.div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-xl border border-border p-3 text-center">
      <p className={`text-lg font-bold ${tone}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
