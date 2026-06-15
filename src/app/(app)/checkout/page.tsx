"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";
import type { PaymentMethod, PaymentBreakdown } from "@/types";
import { ORDERS } from "@/mock/datasets";
import { PageHeader } from "@/components/shared/page-header";
import { Icon } from "@/components/shared/icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { PaymentDialog } from "@/components/checkout/payment-dialog";
import { PAYMENT_METHODS } from "@/lib/payments";
import { useOrderStore, orderSelectors, TAX_RATE } from "@/store/order.store";
import { cn, formatCurrency } from "@/lib/utils";

const TIP_OPTIONS = [0, 0.05, 0.1, 0.15];

export default function CheckoutPage() {
  const storeLines = useOrderStore((s) => s.lines);
  const storeTable = useOrderStore((s) => s.tableNumber);
  const clear = useOrderStore((s) => s.clear);

  // Si no hay pedido en curso, usar uno de ejemplo (mesa 7) para la demo
  const fallback = ORDERS[1];
  const usingStore = storeLines.length > 0;
  const lines = usingStore ? storeLines : fallback.lines;
  const table = usingStore ? storeTable : fallback.tableNumber;

  const [tipRate, setTipRate] = useState(0.1);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [payOpen, setPayOpen] = useState(false);

  const subtotal = useMemo(() => orderSelectors.subtotal(lines), [lines]);
  const taxedBase = Math.max(subtotal - discount, 0);
  const tax = Math.round(taxedBase * TAX_RATE);
  const tip = Math.round(subtotal * tipRate);
  const total = taxedBase + tax + tip;

  const breakdown: PaymentBreakdown = { subtotal, tax, taxRate: TAX_RATE, discount, tip, total };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caja y Cobro"
        description={table ? `Cobrando mesa ${table}` : "Venta directa"}
        icon={<CreditCard className="h-5 w-5" />}
        actions={<Badge variant="secondary">{orderSelectors.count(lines)} ítems</Badge>}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        {/* Detalle */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de la cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-xl">
                  {l.product.image}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{l.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.quantity} × {formatCurrency(l.unitPrice)}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {formatCurrency(orderSelectors.lineTotal(l))}
                </span>
              </div>
            ))}

            <Separator className="my-3" />

            <div>
              <p className="mb-2 text-sm font-semibold">Propina sugerida</p>
              <div className="grid grid-cols-4 gap-2">
                {TIP_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTipRate(t)}
                    className={cn(
                      "rounded-lg border py-2 text-sm font-medium transition-colors",
                      tipRate === t ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                    )}
                  >
                    {t === 0 ? "Sin propina" : `${t * 100}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-2 text-sm font-semibold">Descuento</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
                <Button variant="outline" onClick={() => setDiscount(Math.round(subtotal * 0.1))}>
                  -10%
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pago */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatCurrency(subtotal)} />
              {discount > 0 && <Row label="Descuento" value={`- ${formatCurrency(discount)}`} accent />}
              <Row label={`IVA (${Math.round(TAX_RATE * 100)}%)`} value={formatCurrency(tax)} muted />
              <Row label="Propina" value={formatCurrency(tip)} muted />
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Total a pagar</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Método de pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                      method === m.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted"
                    )}
                  >
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", m.color)}>
                      <Icon name={m.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-[11px] text-muted-foreground">{m.hint}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Button size="lg" className="mt-4 w-full text-base" onClick={() => setPayOpen(true)}>
                Cobrar {formatCurrency(total)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        method={method}
        breakdown={breakdown}
        table={table}
        onComplete={() => {
          if (usingStore) clear();
          toast.success("Venta registrada correctamente");
        }}
      />
    </div>
  );
}

function Row({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={cn("font-medium", muted && "text-muted-foreground", accent && "text-success")}>{value}</span>
    </div>
  );
}
