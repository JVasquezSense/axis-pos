"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Clock, Users, Link2, GripVertical } from "lucide-react";
import type { RestaurantTable, SalonZone } from "@/types";
import { TABLE_STATUS } from "@/lib/status";
import { cn, formatElapsed, minutesAgo } from "@/lib/utils";
import { useIsPhone } from "@/hooks/use-media-query";

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
  isSelected,
  containerRef,
  onClick,
  onReposition,
}: {
  table: RestaurantTable;
  index: number;
  layoutMode: boolean;
  isSelected?: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  onClick: () => void;
  onReposition: (id: string, x: number, y: number) => void;
}) {
  const status = TABLE_STATUS[table.status];
  // Una mesa libre no lleva reloj aunque arrastre un seatedAt viejo.
  const elapsed = table.seatedAt && table.status !== "available" ? minutesAgo(new Date(table.seatedAt)) : 0;
  const isLong = elapsed > 90;

  const handleDragEnd = (_: unknown, info: { offset: { x: number; y: number } }) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const newX = clamp(table.x + (info.offset.x / rect.width) * 100, 4, 96);
    const newY = clamp(table.y + (info.offset.y / rect.height) * 100, 4, 96);
    onReposition(table.id, newX, newY);
  };

  return (
    <motion.div
      // key includes position so framer resets internal x/y on reposition
      key={`${table.id}-${Math.round(table.x * 10)}-${Math.round(table.y * 10)}`}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.03, type: "spring", stiffness: 260, damping: 22 }}
      drag={layoutMode}
      dragMomentum={false}
      dragElastic={0}
      // No dragConstraints: the ref-based constraint miscalculates bounds when
      // translateX/Y: "-50%" is in use; clamp in handleDragEnd is enough.
      style={{
        left: `${table.x}%`,
        top: `${table.y}%`,
        position: "absolute",
        translateX: "-50%",
        translateY: "-50%",
        cursor: layoutMode ? "grab" : "pointer",
        zIndex: layoutMode ? 20 : 10,
      }}
      whileHover={layoutMode ? { scale: 1.08 } : { scale: 1.05 }}
      whileDrag={{ scale: 1.1, zIndex: 50, cursor: "grabbing" }}
      onDragEnd={handleDragEnd}
      onClick={onClick}
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
          layoutMode && !isSelected && "ring-primary/40 border-primary/60",
          isSelected && "ring-primary border-primary shadow-primary/30 shadow-lg"
        )}
      >
        <span className={cn("absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full", status.dot, table.status === "billing" && "animate-pulse")} />
        <span className="text-lg font-black leading-none">{table.number}</span>
        <span className="mt-0.5 flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Users className="h-2.5 w-2.5" /> {table.capacity}
        </span>
        {table.seatedAt && !table.mergedInto && table.status !== "available" && (
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
  selectedId,
  onReposition,
}: {
  tables: RestaurantTable[];
  zones: SalonZone[];
  onSelect: (t: RestaurantTable) => void;
  layoutMode?: boolean;
  selectedId?: string;
  onReposition: (id: string, x: number, y: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isPhone = useIsPhone();

  // Sort zones by yStart to compute dividers and label positions
  const sorted = [...zones].sort((a, b) => a.yStart - b.yStart);

  // En el teléfono el plano libre no cabe: las mesas quedaban encimadas.
  // Se listan por zona en una cuadrícula; el plano (y el modo editar) es
  // cosa de pantalla grande.
  if (isPhone) {
    return <TableGrid tables={tables} zones={sorted} onSelect={onSelect} layoutMode={layoutMode} />;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-[560px] w-full overflow-hidden rounded-2xl border bg-[radial-gradient(hsl(var(--muted-foreground)/0.12)_1px,transparent_1px)] [background-size:22px_22px] transition-colors",
        layoutMode ? "border-primary/50 bg-primary/[0.02]" : "border-border"
      )}
    >
      {/* Zone labels + dividers */}
      {sorted.map((zone) => (
        <ZoneStrip key={zone.id} zone={zone} />
      ))}

      {/* Tables */}
      {tables.map((t, i) => (
        <TableNode
          key={t.id}
          table={t}
          index={i}
          layoutMode={layoutMode}
          isSelected={layoutMode && t.id === selectedId}
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

/** Vista de teléfono: mesas agrupadas por zona, sin posiciones libres. */
function TableGrid({
  tables,
  zones,
  onSelect,
  layoutMode,
}: {
  tables: RestaurantTable[];
  zones: SalonZone[];
  onSelect: (t: RestaurantTable) => void;
  layoutMode: boolean;
}) {
  const known = new Set(zones.map((z) => z.name));
  const groups: { name: string; tables: RestaurantTable[] }[] = zones.map((z) => ({
    name: z.name,
    tables: tables.filter((t) => t.zone === z.name),
  }));
  const orphans = tables.filter((t) => !known.has(t.zone));
  if (orphans.length) groups.push({ name: "Sin zona", tables: orphans });

  return (
    <div className="space-y-4">
      {layoutMode && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
          Para mover las mesas en el plano usa una pantalla grande. Aquí puedes seleccionar una mesa para editarla.
        </p>
      )}
      {groups.filter((g) => g.tables.length > 0).map((g) => (
        <section key={g.name} className="rounded-2xl border border-border p-3">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{g.name}</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {[...g.tables].sort((a, b) => a.number - b.number).map((t) => (
              <TableTile key={t.id} table={t} onClick={() => onSelect(t)} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function TableTile({ table, onClick }: { table: RestaurantTable; onClick: () => void }) {
  const status = TABLE_STATUS[table.status];
  const elapsed = table.seatedAt ? minutesAgo(new Date(table.seatedAt)) : 0;
  const isLong = elapsed > 90;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border-2 px-2 py-3 text-center shadow-sm ring-2 active:scale-95 transition-transform",
        status.surface,
        status.ring
      )}
    >
      <span className={cn("absolute right-2 top-2 h-2.5 w-2.5 rounded-full", status.dot, table.status === "billing" && "animate-pulse")} />
      <span className="text-xl font-black leading-none">{table.number}</span>
      <span className="mt-1 flex items-center gap-0.5 text-[10px] text-muted-foreground">
        <Users className="h-2.5 w-2.5" /> {table.capacity}
      </span>
      {table.seatedAt && !table.mergedInto && table.status !== "available" && (
        <span className={cn("mt-0.5 flex items-center gap-0.5 text-[10px] font-medium", isLong ? "text-destructive" : status.text)}>
          <Clock className="h-2.5 w-2.5" /> {formatElapsed(elapsed)}
        </span>
      )}
      {table.mergedInto && (
        <span className="mt-0.5 flex items-center gap-0.5 text-[10px] font-bold text-primary">
          <Link2 className="h-2.5 w-2.5" /> Mesa {table.mergedInto}
        </span>
      )}
      {table.waiter && !table.mergedInto && (
        <span className="mt-1 w-full truncate text-[10px] text-muted-foreground">{table.waiter}</span>
      )}
    </button>
  );
}

/** Franja de la zona: cada una ocupa el alto que le asignó el restaurante. */
function ZoneStrip({ zone }: { zone: SalonZone }) {
  const height = Math.max(zone.height ?? 30, 4);
  return (
    <>
      <div
        className="pointer-events-none absolute inset-x-0 border-t border-dashed border-border"
        style={{ top: `${zone.yStart}%`, height: `${height}%` }}
      />
      <span
        className="pointer-events-none absolute left-4 z-10 rounded-md bg-background/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur"
        style={{ top: `${zone.yStart + 1}%` }}
      >
        {zone.name}
      </span>
    </>
  );
}
