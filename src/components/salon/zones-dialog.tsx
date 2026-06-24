"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Check, X, GripVertical, AlertTriangle } from "lucide-react";
import type { SalonZone } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function uid() {
  return `z-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

interface ZoneRowProps {
  zone: SalonZone;
  tablesInZone: number;
  onUpdate: (z: SalonZone) => void;
  onDelete: (id: string) => void;
  isOnly: boolean;
}

function ZoneRow({ zone, tablesInZone, onUpdate, onDelete, isOnly }: ZoneRowProps) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(zone.name);
  const [yStart, setYStart] = useState(zone.yStart);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = () => {
    if (!name.trim()) return;
    onUpdate({ ...zone, name: name.trim(), yStart: Math.max(0, Math.min(90, yStart)) });
    setEditing(false);
  };

  const cancel = () => {
    setName(zone.name);
    setYStart(zone.yStart);
    setEditing(false);
    setConfirmDelete(false);
  };

  if (confirmDelete) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
        <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">¿Eliminar &ldquo;{zone.name}&rdquo;?</p>
          {tablesInZone > 0 && (
            <p className="text-xs text-muted-foreground">{tablesInZone} mesa(s) pertenecen a esta zona.</p>
          )}
        </div>
        <Button size="sm" variant="destructive" onClick={() => onDelete(zone.id)}>Eliminar</Button>
        <Button size="sm" variant="outline" onClick={cancel}>Cancelar</Button>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre de zona</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel(); }}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">
            Posición vertical — {yStart}% desde arriba
          </label>
          <input
            type="range"
            min={0}
            max={90}
            value={yStart}
            onChange={(e) => setYStart(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>Arriba (0%)</span>
            <span>Abajo (90%)</span>
          </div>
        </div>
        {/* Mini preview */}
        <div className="relative h-16 w-full overflow-hidden rounded-lg border border-border bg-muted/30">
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed border-primary"
            style={{ top: `${(yStart / 90) * 100}%` }}
          />
          <span
            className="absolute left-2 rounded-sm bg-primary/10 px-1 py-0.5 text-[9px] font-semibold text-primary"
            style={{ top: `calc(${(yStart / 90) * 100}% + 2px)` }}
          >
            {name || "Zona"}
          </span>
        </div>
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={cancel}><X className="h-3.5 w-3.5" /> Cancelar</Button>
          <Button size="sm" onClick={save} disabled={!name.trim()}><Check className="h-3.5 w-3.5" /> Guardar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/30">
      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/40" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{zone.name}</p>
        <p className="text-xs text-muted-foreground">
          Desde {zone.yStart}% · {tablesInZone} mesa{tablesInZone !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
          disabled={isOnly}
          title={isOnly ? "Debe existir al menos una zona" : undefined}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function ZonesDialog({
  open,
  onOpenChange,
  zones,
  tablesByZone,
  onAdd,
  onUpdate,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  zones: SalonZone[];
  tablesByZone: Record<string, number>;
  onAdd: (z: SalonZone) => void;
  onUpdate: (z: SalonZone) => void;
  onDelete: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newY, setNewY] = useState(50);

  const sorted = [...zones].sort((a, b) => a.yStart - b.yStart);

  const submitAdd = () => {
    if (!newName.trim()) return;
    onAdd({ id: uid(), name: newName.trim(), yStart: newY });
    setNewName("");
    setNewY(50);
    setAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gestionar zonas</DialogTitle>
          <DialogDescription>Crea, edita o elimina las zonas del salón.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {sorted.map((zone) => (
            <ZoneRow
              key={zone.id}
              zone={zone}
              tablesInZone={tablesByZone[zone.name] ?? 0}
              onUpdate={onUpdate}
              onDelete={onDelete}
              isOnly={zones.length <= 1}
            />
          ))}
        </div>

        {adding ? (
          <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre de zona</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Ej: VIP, Patio, Privado"
                className="h-8 text-sm"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") submitAdd(); if (e.key === "Escape") setAdding(false); }}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Posición vertical — {newY}% desde arriba
              </label>
              <input
                type="range"
                min={0}
                max={90}
                value={newY}
                onChange={(e) => setNewY(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
            <div className={cn("flex justify-end gap-2")}>
              <Button size="sm" variant="outline" onClick={() => { setAdding(false); setNewName(""); }}>
                <X className="h-3.5 w-3.5" /> Cancelar
              </Button>
              <Button size="sm" onClick={submitAdd} disabled={!newName.trim()}>
                <Check className="h-3.5 w-3.5" /> Agregar zona
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" className="w-full" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" /> Nueva zona
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
