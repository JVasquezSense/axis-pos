"use client";

import { useEffect, useReducer, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ChefHat, Radio } from "lucide-react";
import type { KdsStatus } from "@/types";
import { useKitchenStore } from "@/store/kitchen.store";
import { useAuthStore } from "@/store/auth.store";
import { USE_API } from "@/services/http";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketCard } from "@/components/kitchen/ticket-card";
import { KDS_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

const COLUMNS: KdsStatus[] = ["pending", "preparing", "ready"];

export default function KitchenPage() {
  const tickets = useKitchenStore((s) => s.tickets);
  const advanceStore = useKitchenStore((s) => s.advance);
  const toggleItem = useKitchenStore((s) => s.toggleItem);
  const load = useKitchenStore((s) => s.load);
  const connect = useKitchenStore((s) => s.connect);
  const wsConnected = useKitchenStore((s) => s.wsConnected);
  const tenantId = useAuthStore((s) => s.tenantId);
  const [mounted, setMounted] = useState(false);
  const [, forceTick] = useReducer((x) => x + 1, 0);

  useEffect(() => setMounted(true), []);

  // Carga los pedidos activos y se conecta al WebSocket de cocina en tiempo real.
  useEffect(() => {
    load();
    if (!tenantId) return;
    const disconnect = connect(tenantId);
    return disconnect;
  }, [load, connect, tenantId]);

  // Reloj en vivo: recalcula los tiempos de espera
  useEffect(() => {
    const clock = setInterval(() => forceTick(), 15000);
    return () => clearInterval(clock);
  }, []);

  const advance = (id: string) => {
    const t = tickets.find((x) => x.id === id);
    if (t && t.status === "preparing") toast.success(`${t.code} listo para servir`);
    advanceStore(id);
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col space-y-5">
      <PageHeader
        title="Cocina · KDS"
        description="Tablero de preparación en tiempo real"
        icon={<ChefHat className="h-5 w-5" />}
        actions={
          !USE_API ? null : (
            <Badge variant={wsConnected ? "success" : "secondary"} className="gap-1.5">
              <Radio className={cn("h-3.5 w-3.5", wsConnected && "animate-pulse")} />
              {wsConnected ? "Conectado · WebSocket" : "Sin conexión en vivo"}
            </Badge>
          )
        }
      />

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        {COLUMNS.map((col) => {
          const colTickets = (tickets ?? []).filter((t) => t.status === col);
          return (
            <div key={col} className="flex min-h-0 flex-col rounded-2xl bg-muted/40 p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("h-2.5 w-2.5 rounded-full", KDS_STATUS[col].accent.replace("border-t-", "bg-"))} />
                  <h3 className="font-semibold">{KDS_STATUS[col].label}</h3>
                </div>
                <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold">
                  {colTickets.length}
                </span>
              </div>
              <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-0.5">
                {!mounted ? (
                  Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
                ) : (
                  <AnimatePresence mode="popLayout">
                    {colTickets.map((t) => (
                      <TicketCard key={t.id} ticket={t} onAdvance={advance} onToggleItem={toggleItem} />
                    ))}
                  </AnimatePresence>
                )}
                {mounted && colTickets.length === 0 && (
                  <p className="py-8 text-center text-sm text-muted-foreground">Sin órdenes</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
