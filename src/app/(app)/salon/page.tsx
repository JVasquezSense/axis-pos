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

/** Calcula una posición libre en el mapa para la zona dada. */
function nextPosition(tables: RestaurantTable[], zone: string) {
  const inZone = tables.filter((t) => t.zone === zone).length;
  const col = inZone % 4;
  const row = Math.floor(inZone / 4);
  return {
    x: Math.min(12 + col * 21, 88),
    y: Math.min((ZONE_Y[zone] ?? 48) + row * 11, 92),
  };
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

      <TableDrawer table={selected} open={open} onOpenChange={setOpen} />
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
