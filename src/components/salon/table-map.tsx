"use client";

import { useRef } from "react";
import { motion, useMotionValue } from "framer-motion";
import { Clock, Users, Link2, GripVertical } from "lucide-react";
import type { RestaurantTable, SalonZone } from "@/types";
import { TABLE_STATUS } from "@/lib/status";
import { cn, formatElapsed, minutesAgo } from "@/lib/utils";

const SHAPE: Record<RestaurantTable["shape"], string> = {
  round: "rounded-full aspect-square",
  square: "rounded-2xl aspect-square",
  rect: "rounded-2xl aspect-[1.6/1]",
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function TableNode({
  table,
  index,
  layoutMode,
  containerRef,
  onClick,
  onReposition,
}: {
  table: RestaurantTable;
  index: number;
  layoutMode: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onClick: () => void;
  onReposition: (id: string, x: number, y: number) => void;
}) {
  const status = TABLE_STATUS[table.status];
  const elapsed = table.seatedAt ? minutesAgo(new Date(table.seatedAt)) : 0;
  const isLong = elapsed > 90;
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const handleDragEnd = (_: unknown, info: { offset: { x: number; y: number } }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const newX = clamp(table.x + (info.offset.x / rect.width) * 100, 4, 96);
    const newY = clamp(table.y + (info.offset.y / rect.height) * 100, 4, 96);
    dragX.set(0);
    dragY.set(0);
    onReposition(table.id, newX, newY);
  };

  return (
    <motion.div
      key={table.id}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 260, damping: 22 }}
      drag={layoutMode}
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={containerRef}
      style={{
        left: `${table.x}%`,
        top: `${table.y}%`,
        x: dragX,
        y: dragY,
        position: "absolute",
        translateX: "-50%",
        translateY: "-50%",
        cursor: layoutMode ? "grab" : "pointer",
        zIndex: layoutMode ? 20 : 10,
      }}
      whileHover={layoutMode ? { scale: 1.08 } : { scale: 1.05, y: -2 }}
      whileDrag={{ scale: 1.1, zIndex: 50, cursor: "grabbing" }}
      onDragEnd={handleDragEnd}
      onClick={layoutMode ? undefined : onClick}
    >
      {layoutMode && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex items-center gap-0.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-primary-foreground shadow">
          <GripVertical className="h-2.5 w-2.5" /> Mover
        </div>
      )}
      <div
        className={cn(
          "relative flex w-[88px] flex-col items-center justify-center border-2 p-2 shadow-sm ring-4 transition-shadow hover:shadow-lg",
          SHAPE[table.shape],
          status.surface,
          status.ring,
          layoutMode && "ring-primary/40 border-primary/60"
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
      {table.waiter && !table.mergedInto && !layoutMode && (
        <span className="mt-1 block max-w-[88px] truncate text-center text-[10px] text-muted-foreground">
          {table.waiter}
        </span>
      )}
    </motion.div>
  );
}

export function TableMap({
  tables,
  zones,
  onSelect,
  layoutMode = false,
  onReposition,
}: {
  tables: RestaurantTable[];
  zones: SalonZone[];
  onSelect: (t: RestaurantTable) => void;
  layoutMode?: boolean;
  onReposition: (id: string, x: number, y: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Sort zones by yStart to compute dividers and label positions
  const sorted = [...zones].sort((a, b) => a.yStart - b.yStart);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-[560px] w-full overflow-hidden rounded-2xl border bg-[radial-gradient(hsl(var(--muted-foreground)/0.12)_1px,transparent_1px)] [background-size:22px_22px] transition-colors",
        layoutMode ? "border-primary/50 bg-primary/[0.02]" : "border-border"
      )}
    >
      {/* Zone labels + dividers */}
      {sorted.map((zone, i) => {
        const nextY = sorted[i + 1]?.yStart;
        return (
          <ZoneStrip key={zone.id} zone={zone} nextYStart={nextY} />
        );
      })}

      {/* Tables */}
      {tables.map((t, i) => (
        <TableNode
          key={t.id}
          table={t}
          index={i}
          layoutMode={layoutMode}
          containerRef={containerRef as React.RefObject<HTMLDivElement>}
          onClick={() => onSelect(t)}
          onReposition={onReposition}
        />
      ))}

      {/* Layout mode overlay hint */}
      {layoutMode && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-primary/30 bg-background/90 px-4 py-1.5 text-xs font-medium text-primary shadow backdrop-blur">
          Arrastra las mesas para reposicionarlas
        </div>
      )}
    </div>
  );
}

function ZoneStrip({ zone, nextYStart }: { zone: SalonZone; nextYStart?: number }) {
  const labelTop = zone.yStart + 2;
  return (
    <>
      <span
        className="pointer-events-none absolute left-4 z-10 rounded-md bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur"
        style={{ top: `${labelTop}%` }}
      >
        {zone.name}
      </span>
      {nextYStart !== undefined && (
        <div
          className="pointer-events-none absolute inset-x-6 border-t border-dashed border-border"
          style={{ top: `${nextYStart}%` }}
        />
      )}
    </>
  );
}
