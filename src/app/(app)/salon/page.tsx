"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Armchair, Plus, LayoutGrid, Layers, Copy, Pencil, Trash2, X, Check } from "lucide-react";
import type { RestaurantTable, TableStatus, SalonZone } from "@/types";
import { useTablesStore } from "@/store/tables.store";
import { useAppStore } from "@/store/app.store";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TableMap } from "@/components/salon/table-map";
import { TableDrawer } from "@/components/salon/table-drawer";
import { AddTableDialog, type NewTableData } from "@/components/salon/add-table-dialog";
import { ZonesDialog } from "@/components/salon/zones-dialog";
import { TABLE_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

const SHAPES: { id: RestaurantTable["shape"]; label: string }[] = [
  { id: "round", label: "Redonda" },
  { id: "square", label: "Cuadrada" },
  { id: "rect", label: "Rectangular" },
];

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
  const deleteTableStore = useTablesStore((s) => s.deleteTable);
  const duplicateTableStore = useTablesStore((s) => s.duplicateTable);
  const updateTablePropsStore = useTablesStore((s) => s.updateTableProps);
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
  const [layoutSelectedId, setLayoutSelectedId] = useState<string | null>(null);
  const layoutSelected = tables.find((t) => t.id === layoutSelectedId) ?? null;

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editNumber, setEditNumber] = useState(0);
  const [editCapacity, setEditCapacity] = useState(4);
  const [editZone, setEditZone] = useState("");
  const [editShape, setEditShape] = useState<RestaurantTable["shape"]>("square");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!layoutMode) setLayoutSelectedId(null);
  }, [layoutMode]);

  const select = (t: RestaurantTable) => {
    if (layoutMode) {
      setLayoutSelectedId((prev) => (prev === t.id ? null : t.id));
      return;
    }
    setSelectedId(t.id);
    setOpen(true);
  };

  const openEdit = (t: RestaurantTable) => {
    setEditNumber(t.number);
    setEditCapacity(t.capacity);
    setEditZone(t.zone);
    setEditShape(t.shape);
    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!layoutSelectedId) return;
    const duplicate = tables.some((t) => t.id !== layoutSelectedId && t.number === editNumber);
    if (duplicate || editNumber < 1 || editCapacity < 1) return;
    updateTablePropsStore(layoutSelectedId, {
      number: editNumber,
      capacity: editCapacity,
      zone: editZone,
      shape: editShape,
    });
    setEditOpen(false);
    toast.success(`Mesa ${editNumber} actualizada`);
  };

  const handleDuplicate = (id: string) => {
    duplicateTableStore(id);
    const src = tables.find((t) => t.id === id);
    toast.success(`Mesa duplicada`, { description: src ? `Copia de Mesa ${src.number}` : undefined });
  };

  const handleDelete = (id: string) => {
    const t = tables.find((x) => x.id === id);
    if (t?.status !== "available") {
      toast.error("No se puede eliminar una mesa ocupada");
      return;
    }
    deleteTableStore(id);
    setLayoutSelectedId(null);
    toast.success(`Mesa ${t?.number ?? ""} eliminada`);
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
          selectedId={layoutSelectedId ?? undefined}
          onReposition={repositionTable}
        />
      )}

      {/* Layout mode action bar */}
      {layoutMode && isAdmin && (
        <Card className={cn(
          "relative z-[60] flex items-center gap-3 p-4 transition-all",
          layoutSelected ? "opacity-100" : "opacity-50 pointer-events-none"
        )}>
          <div className="flex-1 min-w-0">
            {layoutSelected ? (
              <>
                <p className="font-semibold">Mesa {layoutSelected.number}</p>
                <p className="text-xs text-muted-foreground">
                  {layoutSelected.zone} · {layoutSelected.capacity} personas · {layoutSelected.shape === "round" ? "Redonda" : layoutSelected.shape === "rect" ? "Rectangular" : "Cuadrada"}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Toca una mesa para seleccionarla</p>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => layoutSelected && openEdit(layoutSelected)}
          >
            <Pencil className="h-3.5 w-3.5" /> Editar
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => layoutSelected && handleDuplicate(layoutSelected.id)}
          >
            <Copy className="h-3.5 w-3.5" /> Duplicar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => layoutSelected && handleDelete(layoutSelected.id)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Eliminar
          </Button>
        </Card>
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

      {/* Edit table dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar mesa</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Número</label>
                <Input
                  type="number"
                  min={1}
                  value={editNumber}
                  onChange={(e) => setEditNumber(Number(e.target.value))}
                  className={cn(
                    tables.some((t) => t.id !== layoutSelectedId && t.number === editNumber) &&
                      "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {tables.some((t) => t.id !== layoutSelectedId && t.number === editNumber) && (
                  <p className="mt-1 text-xs text-destructive">Ya existe la mesa {editNumber}.</p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Capacidad</label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(Number(e.target.value))}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Zona</label>
              <Select value={editZone} onValueChange={setEditZone}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {sortedZones.map((z) => (
                    <SelectItem key={z.id} value={z.name}>{z.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Forma</label>
              <div className="grid grid-cols-3 gap-2">
                {SHAPES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setEditShape(s.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-colors",
                      editShape === s.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                    )}
                  >
                    <span className={cn(
                      "h-7 border-2 border-current",
                      s.id === "round" && "w-7 rounded-full",
                      s.id === "square" && "w-7 rounded-md",
                      s.id === "rect" && "w-11 rounded-md"
                    )} />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              <X className="h-3.5 w-3.5" /> Cancelar
            </Button>
            <Button
              onClick={saveEdit}
              disabled={
                editNumber < 1 ||
                editCapacity < 1 ||
                tables.some((t) => t.id !== layoutSelectedId && t.number === editNumber)
              }
            >
              <Check className="h-3.5 w-3.5" /> Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
