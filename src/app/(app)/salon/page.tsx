"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Armchair, Plus } from "lucide-react";
import type { RestaurantTable, TableStatus } from "@/types";
import { salonService } from "@/services/salon.service";
import { useAsync } from "@/hooks/use-async";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableMap } from "@/components/salon/table-map";
import { TableDrawer } from "@/components/salon/table-drawer";
import { AddTableDialog, type NewTableData } from "@/components/salon/add-table-dialog";
import { TABLE_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

const ZONE_Y: Record<string, number> = {
  Terraza: 18,
  "Salón principal": 48,
  Barra: 78,
};

/**
 * Encuentra una posición libre en el mapa para la zona dada, evitando que la
 * nueva mesa se superponga con las existentes. Prueba primero la fila de la zona
 * y, si está llena, recorre todo el lienzo hasta hallar un hueco.
 */
function nextPosition(tables: RestaurantTable[], zone: string) {
  const baseY = ZONE_Y[zone] ?? 48;
  // Dos mesas chocan si están muy cerca en X y en Y (nodo ~6% ancho · ~16% alto)
  const free = (x: number, y: number) =>
    !tables.some((t) => Math.abs(t.x - x) < 10 && Math.abs(t.y - y) < 16);

  const xs = [12, 32, 52, 74, 90];
  const yBands = [baseY, baseY + 18, baseY - 15];
  for (const y of yBands) {
    if (y < 7 || y > 93) continue;
    for (const x of xs) if (free(x, y)) return { x, y };
  }

  // Último recurso: barrido fino de todo el lienzo
  for (let y = 10; y <= 90; y += 5) {
    for (let x = 10; x <= 92; x += 5) {
      if (free(x, y)) return { x, y };
    }
  }
  return { x: 50, y: 50 };
}

export default function SalonPage() {
  const { data, loading } = useAsync(() => salonService.getTables());
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selected, setSelected] = useState<RestaurantTable | null>(null);
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Carga inicial → estado local editable
  useEffect(() => {
    if (data) setTables(data);
  }, [data]);

  const select = (t: RestaurantTable) => {
    setSelected(t);
    setOpen(true);
  };

  const moveTable = (sourceId: string, targetId: string) => {
    setTables((prev) => {
      const src = prev.find((t) => t.id === sourceId);
      if (!src) return prev;
      return prev.map((t) => {
        if (t.id === targetId)
          return { ...t, status: src.status, guests: src.guests, waiter: src.waiter, seatedAt: src.seatedAt, orderTotal: src.orderTotal };
        if (t.id === sourceId)
          return { ...t, status: "available" as const, guests: undefined, waiter: undefined, seatedAt: undefined, orderTotal: undefined };
        return t;
      });
    });
  };

  const mergeTable = (sourceId: string, targetId: string) => {
    setTables((prev) => {
      const src = prev.find((t) => t.id === sourceId);
      const tgt = prev.find((t) => t.id === targetId);
      if (!src || !tgt) return prev;
      return prev.map((t) => {
        if (t.id === sourceId)
          return {
            ...t,
            status: "occupied" as const,
            guests: (src.guests ?? 0) + (tgt.guests ?? 0),
            orderTotal: (src.orderTotal ?? 0) + (tgt.orderTotal ?? 0),
            waiter: src.waiter ?? tgt.waiter,
            seatedAt: src.seatedAt ?? tgt.seatedAt,
          };
        if (t.id === targetId)
          return { ...t, status: "available" as const, guests: undefined, waiter: undefined, seatedAt: undefined, orderTotal: undefined };
        return t;
      });
    });
  };

  const createTable = (form: NewTableData) => {
    const pos = nextPosition(tables, form.zone);
    const newTable: RestaurantTable = {
      id: `t-${Date.now()}`,
      number: form.number,
      capacity: form.capacity,
      status: "available",
      zone: form.zone,
      shape: form.shape,
      x: pos.x,
      y: pos.y,
    };
    setTables((prev) => [...prev, newTable]);
    toast.success(`Mesa ${form.number} agregada`, { description: `${form.zone} · ${form.capacity} personas` });
  };

  const counts = tables.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<TableStatus, number>
  );

  const nextNumber = tables.length ? Math.max(...tables.map((t) => t.number)) + 1 : 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salón"
        description={`Mapa interactivo · ${tables.length} mesas · 3 zonas`}
        icon={<Armchair className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva mesa
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(TABLE_STATUS) as TableStatus[]).map((s) => (
          <Card key={s} className="flex items-center gap-3 p-4">
            <span className={cn("h-3 w-3 rounded-full", TABLE_STATUS[s].dot)} />
            <div>
              <p className="text-xl font-bold">{counts[s] ?? 0}</p>
              <p className="text-xs text-muted-foreground">{TABLE_STATUS[s].label}</p>
            </div>
          </Card>
        ))}
      </div>

      {loading && tables.length === 0 ? (
        <Skeleton className="h-[560px] w-full rounded-2xl" />
      ) : (
        <TableMap tables={tables} onSelect={select} />
      )}

      <TableDrawer
        table={selected}
        open={open}
        onOpenChange={setOpen}
        tables={tables}
        onMove={moveTable}
        onMerge={mergeTable}
      />
      <AddTableDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreate={createTable}
        suggestedNumber={nextNumber}
        existingNumbers={tables.map((t) => t.number)}
      />
    </div>
  );
}
