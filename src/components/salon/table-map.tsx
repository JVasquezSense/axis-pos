"use client";

import { motion } from "framer-motion";
import { Clock, Users, Link2 } from "lucide-react";
import type { RestaurantTable } from "@/types";
import { TABLE_STATUS } from "@/lib/status";
import { cn, formatElapsed, minutesAgo } from "@/lib/utils";

const SHAPE: Record<RestaurantTable["shape"], string> = {
  round: "rounded-full aspect-square",
  square: "rounded-2xl aspect-square",
  rect: "rounded-2xl aspect-[1.6/1]",
};

export function TableNode({
  table,
  onClick,
  index,
}: {
  table: RestaurantTable;
  onClick: () => void;
  index: number;
}) {
  const status = TABLE_STATUS[table.status];
  const elapsed = table.seatedAt ? minutesAgo(new Date(table.seatedAt)) : 0;
  const isLong = elapsed > 90;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 260, damping: 22 }}
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{ left: `${table.x}%`, top: `${table.y}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2"
    >
      <div
        className={cn(
          "relative flex w-[88px] flex-col items-center justify-center border-2 p-2 shadow-sm ring-4 transition-shadow hover:shadow-lg",
          SHAPE[table.shape],
          status.surface,
          status.ring
        )}
      >
        <span className={cn("absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full", status.dot, table.status === "billing" && "animate-pulse")} />
        <span className="text-lg font-black leading-none">{table.number}</span>
        <span className="mt-0.5 flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Users className="h-2.5 w-2.5" /> {table.capacity}
        </span>
        {table.seatedAt && !table.mergedInto && (
          <span className={cn("mt-0.5 flex items-center gap-0.5 text-[10px] font-medium", isLong ? "text-destructive" : status.text)}>
            <Clock className="h-2.5 w-2.5" /> {formatElapsed(elapsed)}
          </span>
        )}
        {table.mergedInto && (
          <span className="mt-0.5 flex items-center gap-0.5 text-[10px] font-bold text-primary">
            <Link2 className="h-2.5 w-2.5" /> Mesa {table.mergedInto}
          </span>
        )}
      </div>
      {table.waiter && !table.mergedInto && (
        <span className="mt-1 block max-w-[88px] truncate text-center text-[10px] text-muted-foreground">
          {table.waiter}
        </span>
      )}
    </motion.button>
  );
}

export function TableMap({
  tables,
  onSelect,
}: {
  tables: RestaurantTable[];
  onSelect: (t: RestaurantTable) => void;
}) {
  // Agrupar por zona para dibujar separadores
  return (
    <div className="relative h-[560px] w-full overflow-hidden rounded-2xl border border-border bg-[radial-gradient(hsl(var(--muted-foreground)/0.12)_1px,transparent_1px)] [background-size:22px_22px]">
      {/* Etiquetas de zona */}
      <ZoneLabel label="Terraza" top={4} />
      <ZoneLabel label="Salón principal" top={34} />
      <ZoneLabel label="Barra" top={64} />
      <div className="pointer-events-none absolute inset-x-6 top-[31%] border-t border-dashed border-border" />
      <div className="pointer-events-none absolute inset-x-6 top-[61%] border-t border-dashed border-border" />

      {tables.map((t, i) => (
        <TableNode key={t.id} table={t} index={i} onClick={() => onSelect(t)} />
      ))}
    </div>
  );
}

function ZoneLabel({ label, top }: { label: string; top: number }) {
  return (
    <span
      className="absolute left-4 rounded-md bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur"
      style={{ top: `${top}%` }}
    >
      {label}
    </span>
  );
}
