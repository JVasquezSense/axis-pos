"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Check, Loader2, Printer, Mail } from "lucide-react";
import type { PaymentMethod, PaymentBreakdown } from "@/types";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PAYMENT_LABEL } from "@/lib/payments";
import { formatCurrency } from "@/lib/utils";

type Phase = "processing" | "done";

export function PaymentDialog({
  open,
  onOpenChange,
  method,
  breakdown,
  table,
  saleType,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  method: PaymentMethod;
  breakdown: PaymentBreakdown;
  table?: number | null;
  saleType?: string;
  onComplete: () => void;
}) {
  const [phase, setPhase] = useState<Phase>("processing");
  const codeRef = useRef(`FV-${Math.floor(1000 + Math.random() * 9000)}`);
  const code = codeRef.current;

  // Reinicia el flujo cada vez que se abre
  const handleOpen = (v: boolean) => {
    if (v) setPhase("processing");
    onOpenChange(v);
  };

  useEffect(() => {
    if (!open) return;
    setPhase("processing");
    codeRef.current = `FV-${Math.floor(1000 + Math.random() * 9000)}`;
    const t = setTimeout(() => setPhase("done"), 1800);
    return () => clearTimeout(t);
  }, [open]);

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
              <p className="text-sm text-muted-foreground">Factura {code}</p>
            </div>

            {/* Recibo */}
            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Axis POS · Demo Burger</span>
                <span className="text-xs text-muted-foreground">{code}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {table ? `Mesa ${table} · ` : ""}{saleType ? `${saleType} · ` : ""}15 jun 2026, 8:42 p.m.
              </p>
              <Separator className="my-3" />
              <Row label="Subtotal" value={formatCurrency(breakdown.subtotal)} />
              {breakdown.discount > 0 && <Row label="Descuento" value={`- ${formatCurrency(breakdown.discount)}`} />}
              <Row label={`IVA (${Math.round(breakdown.taxRate * 100)}%)`} value={formatCurrency(breakdown.tax)} />
              {breakdown.tip > 0 && <Row label="Propina" value={formatCurrency(breakdown.tip)} />}
              <Separator className="my-2" />
              <div className="flex items-center justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(breakdown.total)}</span>
              </div>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Pagado con {PAYMENT_LABEL[method]}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={() => toast.success("Factura enviada", { description: `${code} por correo` })}>
                <Mail className="h-4 w-4" /> Enviar
              </Button>
            </div>
            <Button
              className="mt-2"
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
