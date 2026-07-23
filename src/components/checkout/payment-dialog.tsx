"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Loader2, Printer, Mail } from "lucide-react";
import type { PaymentMethod, PaymentBreakdown, OrderLine } from "@/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PAYMENT_LABEL } from "@/lib/payments";
import { formatCurrency } from "@/lib/utils";
import { useAppStore } from "@/store/app.store";

type Phase = "processing" | "done";

export function PaymentDialog({
  open,
  onOpenChange,
  method,
  breakdown,
  table,
  saleType,
  waiter,
  invoiceNumber,
  lines,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  method: PaymentMethod;
  breakdown: PaymentBreakdown;
  table?: number | null;
  saleType?: string;
  waiter?: string;
  invoiceNumber?: string;
  lines?: OrderLine[];
  onComplete: () => void;
}) {
  const restaurant = useAppStore((s) => s.restaurant);
  const [phase, setPhase] = useState<Phase>("processing");

  // Reinicia el flujo cada vez que se abre
  const handleOpen = (v: boolean) => {
    if (v) setPhase("processing");
    onOpenChange(v);
  };

  useEffect(() => {
    if (!open) return;
    setPhase("processing");
    const t = setTimeout(() => setPhase("done"), 1400);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent hideClose className="max-w-sm">
        {phase === "processing" ? (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="relative mb-5">
              <Loader2 className="h-14 w-14 animate-spin text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Procesando pago…</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {PAYMENT_LABEL[method]} · {formatCurrency(breakdown.total)}
            </p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex flex-col items-center py-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-success/15 text-success"
              >
                <Check className="h-9 w-9" />
              </motion.div>
              <h3 className="text-lg font-semibold">Pago aprobado</h3>
              <p className="text-sm text-muted-foreground">{invoiceNumber ? `Factura ${invoiceNumber}` : "Venta registrada"}</p>
            </div>

            {/* Recibo fiscal (backlog #1) */}
            <div className="print-area rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm">
              {/* Encabezado fiscal */}
              <div className="text-center">
                <p className="text-base font-bold">{restaurant.legalName || restaurant.name}</p>
                {restaurant.taxId && <p className="text-xs text-muted-foreground">NIT: {restaurant.taxId}</p>}
                {restaurant.address && <p className="text-xs text-muted-foreground">{restaurant.address}</p>}
                {restaurant.phone && <p className="text-xs text-muted-foreground">Tel: {restaurant.phone}</p>}
                {restaurant.resolution && (
                  <p className="mt-1 text-[10px] leading-tight text-muted-foreground">{restaurant.resolution}</p>
                )}
              </div>
              <Separator className="my-2" />
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-semibold">{invoiceNumber || "—"}</span>
                <span className="text-muted-foreground">
                  {new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })}{" "}
                  {new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                {table ? <span>Mesa: <strong className="text-foreground">{table}</strong></span> : null}
                {saleType ? <span>Tipo: <strong className="text-foreground">{saleType}</strong></span> : null}
                {waiter && waiter !== "Sin asignar" ? <span>Mesero: <strong className="text-foreground">{waiter}</strong></span> : null}
              </div>
              <Separator className="my-2" />

              {/* Líneas de productos */}
              {(lines ?? []).length > 0 && (
                <div className="mb-2 space-y-1">
                  <div className="flex justify-between text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Producto</span>
                    <span>Cant · Valor</span>
                  </div>
                  {(lines ?? []).map((l, i) => {
                    const mods = l.modifiers.reduce((s, m) => s + m.price, 0);
                    const v = (l.unitPrice + mods) * l.quantity;
                    return (
                      <div key={i} className="flex justify-between gap-2 text-xs">
                        <span className="flex-1">
                          {l.product.name}
                          {l.notes && <span className="block text-[10px] italic text-amber-600 dark:text-amber-400">{l.notes}</span>}
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {l.quantity}× · {formatCurrency(v)}
                        </span>
                      </div>
                    );
                  })}
                  <Separator className="my-1" />
                </div>
              )}

              <Row label="Subtotal" value={formatCurrency(breakdown.subtotal)} />
              {breakdown.discount > 0 && <Row label="Descuento" value={`- ${formatCurrency(breakdown.discount)}`} />}
              <Row label={`IVA (${Math.round(breakdown.taxRate * 100)}%)`} value={formatCurrency(breakdown.tax)} />
              {breakdown.tip > 0 && (
                <Row label={`Propina${waiter && waiter !== "Sin asignar" ? ` → ${waiter}` : ""}`} value={formatCurrency(breakdown.tip)} />
              )}
              <Separator className="my-2" />
              <div className="flex items-center justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(breakdown.total)}</span>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Pagado con {PAYMENT_LABEL[method]}
              </p>
              <p className="mt-1 text-center text-[10px] text-muted-foreground">¡Gracias por su compra!</p>
            </div>

            <div className="print-hidden mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.success("Factura enviada", { description: `${invoiceNumber || ""} por correo` })}>
                <Mail className="h-4 w-4" /> Enviar
              </Button>
            </div>
            <Button
              className="print-hidden mt-2"
              onClick={() => {
                onOpenChange(false);
                onComplete();
              }}
            >
              Finalizar y nueva venta
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-muted-foreground">
      <span>{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
