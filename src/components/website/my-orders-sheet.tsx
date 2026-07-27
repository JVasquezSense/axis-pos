"use client";

import { useEffect, useState } from "react";
import { ClipboardList, Loader2 } from "lucide-react";
import { useWebStore } from "@/store/web.store";
import { publicService } from "@/services/public.service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn, formatCurrency } from "@/lib/utils";

// Estados del Order real del backend (flujo KDS), alineados con el POS.
const STATUS: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "default" }> = {
  pending: { label: "En cola", variant: "secondary" },
  preparing: { label: "Preparando", variant: "warning" },
  ready: { label: "Listo para servir", variant: "success" },
  served: { label: "Servido", variant: "success" },
  paid: { label: "Completado", variant: "default" },
};

interface MyOrder {
  id: string;
  code: string;
  status: string;
  table: number | null;
  estimatedWait: number;
  items: { name: string; quantity: number; notes?: string }[];
  createdAt: string;
}

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  return `hace ${Math.floor(m / 60)} h`;
}

export function MyOrdersSheet() {
  const myOrderIds = useWebStore((s) => s.myOrderIds);
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Carga (y refresca) el estado real de los pedidos del dispositivo.
  const refresh = async () => {
    if (myOrderIds.length === 0) { setOrders([]); return; }
    setLoading(true);
    const results = await Promise.all(
      myOrderIds.map((id) => publicService.getStatus(id).catch(() => null))
    );
    const valid = results.filter((r): r is MyOrder => r !== null);
    valid.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setOrders(valid);
    setLoading(false);
  };

  // Al abrir el Sheet, carga. Mientras abierto, refresca cada 15s (estado en vivo).
  useEffect(() => {
    if (!open) return;
    refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [open, myOrderIds.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative gap-1.5">
          <ClipboardList className="h-4 w-4" />
          <span className="hidden sm:inline">Mis pedidos</span>
          {myOrderIds.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
              {myOrderIds.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" /> Mis pedidos
          </SheetTitle>
        </SheetHeader>

        <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
          {myOrderIds.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center text-muted-foreground">
              <ClipboardList className="mb-3 h-10 w-10" />
              <p className="text-sm">Aún no has hecho pedidos.</p>
              <p className="text-xs">Cuando pidas, podrás seguir su estado aquí.</p>
            </div>
          ) : loading && orders.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center text-muted-foreground">
              <Loader2 className="mb-3 h-8 w-8 animate-spin" />
              <p className="text-sm">Cargando tus pedidos…</p>
            </div>
          ) : (
            orders.map((o) => {
              const st = STATUS[o.status] ?? { label: o.status, variant: "secondary" as const };
              return (
                <div key={o.id} className="rounded-2xl border border-border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{o.code}</p>
                      <p className="text-xs text-muted-foreground">
                        {ago(o.createdAt)}
                        {o.table ? ` · Mesa ${o.table}` : ""}
                      </p>
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>

                  {/* Items */}
                  {o.items.length > 0 && (
                    <div className="mt-3 space-y-1 border-t border-border pt-3">
                      {o.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="min-w-0">
                            <span className="font-medium">{it.quantity}× {it.name}</span>
                            {it.notes && <span className="block truncate text-xs italic text-amber-600 dark:text-amber-400">{it.notes}</span>}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Espera (mientras no esté listo) */}
                  {!["ready", "served", "paid"].includes(o.status) && o.estimatedWait > 0 && (
                    <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
                      <span className={cn("h-1.5 w-1.5 animate-pulse rounded-full bg-primary")} />
                      Tiempo de espera estimado: ~{o.estimatedWait} min
                    </div>
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
