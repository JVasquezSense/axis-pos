"use client";

import { useEffect, useState } from "react";
import type { RestaurantTable } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface NewTableData {
  number: number;
  capacity: number;
  zone: string;
  shape: RestaurantTable["shape"];
}

const SHAPES: { id: RestaurantTable["shape"]; label: string }[] = [
  { id: "round", label: "Redonda" },
  { id: "square", label: "Cuadrada" },
  { id: "rect", label: "Rectangular" },
];

export function AddTableDialog({
  open,
  onOpenChange,
  onCreate,
  suggestedNumber,
  existingNumbers,
  zones,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (data: NewTableData) => void;
  suggestedNumber: number;
  existingNumbers: number[];
  zones: string[];
}) {
  const [number, setNumber] = useState(suggestedNumber);
  const [capacity, setCapacity] = useState(4);
  const [zone, setZone] = useState(zones[0]);
  const [shape, setShape] = useState<RestaurantTable["shape"]>("square");

  // Reinicia al abrir
  useEffect(() => {
    if (open) {
      setNumber(suggestedNumber);
      setCapacity(4);
      setZone(zones[0]);
      setShape("square");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, suggestedNumber]);

  const duplicate = existingNumbers.includes(number);
  const valid = number > 0 && capacity > 0 && !duplicate;

  const submit = () => {
    if (!valid) return;
    onCreate({ number, capacity, zone, shape });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva mesa</DialogTitle>
          <DialogDescription>Agrega una mesa disponible al mapa del salón.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Número</label>
              <Input
                type="number"
                min={1}
                value={number}
                onChange={(e) => setNumber(Number(e.target.value))}
                className={cn(duplicate && "border-destructive focus-visible:ring-destructive")}
              />
              {duplicate && <p className="mt-1 text-xs text-destructive">Ya existe la mesa {number}.</p>}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Capacidad</label>
              <Input type="number" min={1} max={20} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Zona</label>
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {zones.map((z) => (
                  <SelectItem key={z} value={z}>{z}</SelectItem>
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
                  onClick={() => setShape(s.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-3 text-xs font-medium transition-colors",
                    shape === s.id ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "h-7 border-2 border-current",
                      s.id === "round" && "w-7 rounded-full",
                      s.id === "square" && "w-7 rounded-md",
                      s.id === "rect" && "w-11 rounded-md"
                    )}
                  />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!valid}>Agregar mesa</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
