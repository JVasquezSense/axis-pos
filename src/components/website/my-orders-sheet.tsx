"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ClipboardList, Check, Upload, Loader2, XCircle } from "lucide-react";
import type { WebOrderStatus } from "@/store/web.store";
import { useWebStore } from "@/store/web.store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn, formatCurrency } from "@/lib/utils";

const STEPS = ["Recibido", "Pago en revisión", "En preparación", "Despachado"];

const STATUS: Record<WebOrderStatus, { label: string; step: number; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  awaiting_receipt: { label: "Falta comprobante", step: 0, variant: "secondary" },
  review: { label: "En revisión", step: 1, variant: "warning" },
  verified: { label: "Aprobado · en preparación", step: 2, variant: "success" },
  dispatched: { label: "Despachado", step: 3, variant: "success" },
  rejected: { label: "Rechazado", step: 1, variant: "destructive" },
};

function ago(ts: number) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h`;
}

export function MyOrdersSheet() {
  const orders = useWebStore((s) => s.liveOrders);
  const uploadReceipt = useWebStore((s) => s.uploadReceipt);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const onFile = (orderId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(orderId);
    const reader = new FileReader();
    reader.onload = () => {
      uploadReceipt(orderId, String(reader.result));
      setUploadingId(null);
      toast.success("Comprobante enviado", { description: "El restaurante verificará tu pago." });
    };
    reader.readAsDataURL(file);
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative gap-1.5">
          <ClipboardList className="h-4 w-4" />
          <span className="hidden sm:inline">Mis pedidos</span>
          {orders.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
              {orders.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" /> Mis pedidos</SheetTitle>
        </SheetHeader>

        <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center text-muted-foreground">
              <ClipboardList className="mb-3 h-10 w-10" />
              <p className="text-sm">Aún no has hecho pedidos.</p>
              <p className="text-xs">Cuando pidas, podrás seguir su estado aquí.</p>
            </div>
          ) : (
            orders.map((o) => {
              const st = STATUS[o.status];
              const rejected = o.status === "rejected";
              return (
                <div key={o.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{o.code}</p>
                      <p className="text-xs text-muted-foreground">{o.items} ítems · {ago(o.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(o.total)}</p>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>
                  </div>

                  {/* Línea de tiempo */}
                  {rejected ? (
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                      <XCircle className="h-4 w-4" /> Comprobante rechazado. Escríbenos para resolverlo.
                    </div>
                  ) : (
                    <div className="mt-4 flex items-center">
                      {STEPS.map((label, i) => {
                        const done = i <= st.step;
                        return (
                          <div key={label} className="flex flex-1 items-center last:flex-none">
                            <div className="flex flex-col items-center">
                              <span className={cn("flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold transition-colors", done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                              </span>
                              <span className={cn("mt-1 w-14 text-center text-[9px] leading-tight", done ? "font-medium text-foreground" : "text-muted-foreground")}>{label}</span>
                            </div>
                            {i < STEPS.length - 1 && <div className={cn("mx-1 h-0.5 flex-1", i < st.step ? "bg-primary" : "bg-muted")} />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Subir comprobante si falta */}
                  {o.status === "awaiting_receipt" && (
                    <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/40 py-2.5 text-sm font-medium transition-colors hover:border-primary hover:bg-primary/5">
                      {uploadingId === o.id ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Upload className="h-4 w-4" />}
                      {uploadingId === o.id ? "Subiendo…" : "Subir comprobante de pago"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onFile(o.id, e)} disabled={uploadingId === o.id} />
                    </label>
                  )}
                </div>
              );
            })
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
