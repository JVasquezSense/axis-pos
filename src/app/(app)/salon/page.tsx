"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Armchair, Plus, LayoutGrid, Layers } from "lucide-react";
import type { RestaurantTable, TableStatus, SalonZone } from "@/types";
import { useTablesStore } from "@/store/tables.store";
import { useAppStore } from "@/store/app.store";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableMap } from "@/components/salon/table-map";
import { TableDrawer } from "@/components/salon/table-drawer";
import { AddTableDialog, type NewTableData } from "@/components/salon/add-table-dialog";
import { ZonesDialog } from "@/components/salon/zones-dialog";
import { TABLE_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

function nextPosition(tables: RestaurantTable[], zones: SalonZone[], zone: string) {
  const zoneObj = [...zones].sort((a, b) => a.yStart - b.yStart).find((z) => z.name === zone);
  const baseY = zoneObj ? zoneObj.yStart + 10 : 48;
  const free = (x: number, y: number) =>
    !tables.some((t) => Math.abs(t.x - x) < 10 && Math.abs(t.y - y) < 16);

  const xs = [12, 32, 52, 74, 90];
  const yBands = [baseY, baseY + 10, baseY - 10];
  for (const y of yBands) {
    if (y < 5 || y > 95) continue;
    for (const x of xs) if (free(x, y)) return { x, y };
  }
  for (let y = 10; y <= 90; y += 5) {
    for (let x = 10; x <= 92; x += 5) {
      if (free(x, y)) return { x, y };
    }
  }
  return { x: 50, y: 50 };
}

export default function SalonPage() {
  const role = useAppStore((s) => s.role);
  const isAdmin = role === "admin";

  const tables = useTablesStore((s) => s.tables);
  const zones = useTablesStore((s) => s.zones);
  const addTableStore = useTablesStore((s) => s.addTable);
  const repositionTable = useTablesStore((s) => s.repositionTable);
  const moveTable = useTablesStore((s) => s.moveOccupancy);
  const mergeTable = useTablesStore((s) => s.mergeTables);
  const addZone = useTablesStore((s) => s.addZone);
  const updateZone = useTablesStore((s) => s.updateZone);
  const removeZone = useTablesStore((s) => s.removeZone);

  const [mounted, setMounted] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = tables.find((t) => t.id === selectedId) ?? null;
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [zonesOpen, setZonesOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState(false);

  useEffect(() => setMounted(true), []);

  const select = (t: RestaurantTable) => {
    if (layoutMode) return;
    setSelectedId(t.id);
    setOpen(true);
  };

  const createTable = (form: NewTableData) => {
    const pos = nextPosition(tables, zones, form.zone);
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
    addTableStore(newTable);
    toast.success(`Mesa ${form.number} agregada`, { description: `${form.zone} · ${form.capacity} personas` });
  };

  const counts = tables.reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<TableStatus, number>
  );

  const tablesByZone = tables.reduce((acc, t) => {
    acc[t.zone] = (acc[t.zone] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const nextNumber = tables.length ? Math.max(...tables.map((t) => t.number)) + 1 : 1;

  const sortedZones = [...zones].sort((a, b) => a.yStart - b.yStart);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salón"
        description={`Mapa interactivo · ${tables.length} mesas · ${zones.length} zona${zones.length !== 1 ? "s" : ""}`}
        icon={<Armchair className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Button
                  size="sm"
                  variant={layoutMode ? "default" : "outline"}
                  onClick={() => setLayoutMode((v) => !v)}
                  className={cn(layoutMode && "bg-primary text-primary-foreground")}
                >
                  <LayoutGrid className="h-4 w-4" />
                  {layoutMode ? "Salir de edición" : "Editar layout"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setZonesOpen(true)}>
                  <Layers className="h-4 w-4" /> Zonas
                </Button>
              </>
            )}
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Nueva mesa
            </Button>
          </div>
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

      {!mounted ? (
        <Skeleton className="h-[560px] w-full rounded-2xl" />
      ) : (
        <TableMap
          tables={tables}
          zones={sortedZones}
          onSelect={select}
          layoutMode={layoutMode && isAdmin}
          onReposition={repositionTable}
        />
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
        zones={sortedZones.map((z) => z.name)}
      />

      {isAdmin && (
        <ZonesDialog
          open={zonesOpen}
          onOpenChange={setZonesOpen}
          zones={zones}
          tablesByZone={tablesByZone}
          onAdd={addZone}
          onUpdate={updateZone}
          onDelete={removeZone}
        />
      )}
    </div>
  );
}
