"use client";

import { motion } from "framer-motion";
import { Check, Clock, Flame, ArrowRight, Globe, Bike, Utensils } from "lucide-react";
import type { KdsTicket, OrderChannel } from "@/types";
import { Button } from "@/components/ui/button";
import { cn, minutesAgo } from "@/lib/utils";

const CHANNEL_ICON: Record<OrderChannel, React.ElementType> = {
  dine_in: Utensils,
  web: Globe,
  delivery: Bike,
  takeaway: ArrowRight,
};

/** Color del borde superior según demora */
function delayClass(minutes: number, status: KdsTicket["status"]) {
  if (status === "ready") return "border-t-emerald-500";
  if (minutes >= 15) return "border-t-destructive";
  if (minutes >= 8) return "border-t-amber-500";
  return "border-t-primary";
}

export function TicketCard({
  ticket,
  onAdvance,
  onToggleItem,
}: {
  ticket: KdsTicket;
  onAdvance: (id: string) => void;
  onToggleItem: (ticketId: string, index: number) => void;
}) {
  const minutes = minutesAgo(new Date(ticket.createdAt));
  const ChannelIcon = CHANNEL_ICON[ticket.channel];
  const late = minutes >= 15 && ticket.status !== "ready";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
      className={cn(
        "rounded-xl border border-t-4 border-border bg-card shadow-sm",
        delayClass(minutes, ticket.status)
      )}
    >
      <div className="flex items-center justify-between border-b border-border p-3">
        <div className="flex items-center gap-2">
          <span className="font-bold">{ticket.code}</span>
          {ticket.table && (
            <span className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-medium">Mesa {ticket.table}</span>
          )}
          {ticket.priority && (
            <span className="inline-flex items-center gap-0.5 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
              <Flame className="h-3 w-3" /> Prioritario
            </span>
          )}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold",
            late ? "text-destructive" : "text-muted-foreground"
          )}
        >
          <Clock className="h-3.5 w-3.5" /> {minutes}m
        </span>
      </div>

      <div className="space-y-1.5 p-3">
        <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <ChannelIcon className="h-3 w-3" />
          {ticket.channel === "dine_in" ? "En mesa" : ticket.channel === "web" ? "Pedido web" : ticket.channel === "delivery" ? "Domicilio" : "Para llevar"}
        </p>
        {ticket.items.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onToggleItem(ticket.id, idx)}
            className="flex w-full items-start gap-2 rounded-lg px-1.5 py-1 text-left transition-colors hover:bg-muted"
          >
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40"
              )}
            >
              {item.done && <Check className="h-3 w-3" />}
            </span>
            <span className={cn("flex-1 text-sm", item.done && "text-muted-foreground line-through")}>
              <span className="font-semibold">{item.quantity}×</span> {item.name}
              {item.notes && <span className="block text-xs italic text-amber-600 dark:text-amber-400">{item.notes}</span>}
            </span>
          </button>
        ))}
      </div>

      {ticket.status !== "ready" && (
        <div className="p-3 pt-0">
          <Button size="sm" variant={ticket.status === "preparing" ? "success" : "default"} className="w-full" onClick={() => onAdvance(ticket.id)}>
            {ticket.status === "pending" ? "Iniciar preparación" : "Marcar listo"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}
