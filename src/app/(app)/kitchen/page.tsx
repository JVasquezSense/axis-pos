"use client";

import { useEffect, useReducer, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ChefHat, Radio } from "lucide-react";
import type { KdsTicket, KdsStatus } from "@/types";
import { kitchenService } from "@/services/kitchen.service";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TicketCard } from "@/components/kitchen/ticket-card";
import { KDS_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

const COLUMNS: KdsStatus[] = ["pending", "preparing", "ready"];
const NEXT: Record<KdsStatus, KdsStatus> = { pending: "preparing", preparing: "ready", ready: "ready" };

export default function KitchenPage() {
  const [tickets, setTickets] = useState<KdsTicket[] | null>(null);
  const [, forceTick] = useReducer((x) => x + 1, 0);

  useEffect(() => {
    kitchenService.getTickets().then(setTickets);
  }, []);

  // Simula reloj en vivo (recalcula tiempos de espera) — preparado para WebSockets
  useEffect(() => {
    const unsub = kitchenService.subscribe(() => forceTick(), 5000);
    const clock = setInterval(() => forceTick(), 15000);
    return () => {
      unsub();
      clearInterval(clock);
    };
  }, []);

  const advance = (id: string) => {
    setTickets((prev) =>
      prev!.map((t) => {
        if (t.id !== id) return t;
        const next = NEXT[t.status];
        if (next === "ready") toast.success(`${t.code} listo para servir`);
        return { ...t, status: next, items: next === "ready" ? t.items.map((i) => ({ ...i, done: true })) : t.items };
      })
    );
  };

  const toggleItem = (ticketId: string, index: number) => {
    setTickets((prev) =>
      prev!.map((t) =>
        t.id === ticketId
          ? { ...t, items: t.items.map((it, i) => (i === index ? { ...it, done: !it.done } : it)) }
          : t
      )
    );
  };

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col space-y-5">
      <PageHeader
        title="Cocina · KDS"
        description="Tablero de preparación en tiempo real"
        icon={<ChefHat className="h-5 w-5" />}
        actions={
          <Badge variant="success" className="gap-1.5">
            <Radio className="h-3.5 w-3.5 animate-pulse" /> Conectado · WebSocket
          </Badge>
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
                {!tickets ? (
                  Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)
                ) : (
                  <AnimatePresence mode="popLayout">
                    {colTickets.map((t) => (
                      <TicketCard key={t.id} ticket={t} onAdvance={advance} onToggleItem={toggleItem} />
                    ))}
                  </AnimatePresence>
                )}
                {tickets && colTickets.length === 0 && (
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
