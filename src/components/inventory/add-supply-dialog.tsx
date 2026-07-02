"use client";

import { useEffect, useMemo, useState } from "react";
import type { InventoryItem, StockStatus } from "@/types";
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
import { useSuppliersStore } from "@/store/suppliers.store";

const NO_SUPPLIER = "none";

const CATEGORIES = ["Carnes", "Lácteos", "Verduras", "Frutas", "Panadería", "Abarrotes", "Bebidas", "Pescados", "Congelados"];
const UNITS = ["Kg", "Gr", "Lt", "Ml", "Und"];

function statusFor(stock: number, min: number): StockStatus {
  if (stock <= min * 0.4) return "critical";
  if (stock < min) return "low";
  return "normal";
}

export function AddSupplyDialog({
  open,
  onOpenChange,
  onCreate,
  initialItem,
  onUpdate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate?: (item: InventoryItem) => void;
  initialItem?: InventoryItem;
  onUpdate?: (item: InventoryItem) => void;
}) {
  const isEdit = !!initialItem;
  const [name, setName] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [stock, setStock] = useState(0);
  const [unit, setUnit] = useState("Kg");
  const [minStock, setMinStock] = useState(0);
  const [cost, setCost] = useState(0);
  const [supplier, setSupplier] = useState("");

  const suppliers = useSuppliersStore((s) => s.suppliers);
  const supplierNames = useMemo(() => {
    const names = suppliers.filter((s) => s.active).map((s) => s.name);
    // Conserva el valor actual aunque el proveedor ya no exista o esté inactivo.
    if (supplier && !names.includes(supplier)) names.push(supplier);
    return [...new Set(names)].sort((a, b) => a.localeCompare(b));
  }, [suppliers, supplier]);

  useEffect(() => {
    if (open) {
      if (initialItem) {
        setName(initialItem.name);
        setCategory(initialItem.category);
        setStock(initialItem.stock);
        setUnit(initialItem.unit);
        setMinStock(initialItem.minStock);
        setCost(initialItem.cost);
        setSupplier(initialItem.supplier ?? "");
      } else {
        setName(""); setCategory(CATEGORIES[0]); setStock(0); setUnit("Kg"); setMinStock(0); setCost(0); setSupplier("");
      }
    }
  }, [open, initialItem]);

  const valid = name.trim() && cost > 0 && minStock >= 0;

  const submit = () => {
    if (!valid) return;
    if (isEdit && initialItem && onUpdate) {
      onUpdate({
        ...initialItem,
        name: name.trim(),
        category,
        stock,
        unit,
        minStock,
        cost,
        supplier: supplier.trim() || "Sin proveedor",
        status: statusFor(stock, minStock),
        updatedAt: "Justo ahora",
      });
    } else if (onCreate) {
      onCreate({
        id: `i-${Date.now()}`,
        name: name.trim(),
        category,
        stock,
        unit,
        minStock,
        cost,
        supplier: supplier.trim() || "Sin proveedor",
        status: statusFor(stock, minStock),
        updatedAt: "Justo ahora",
      });
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar insumo" : "Nuevo insumo"}</DialogTitle>
          <DialogDescription>{isEdit ? "Modifica los datos del insumo." : "Registra una materia prima con su stock inicial y costo."}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nombre del insumo</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Carne de res molida" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Categoría</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Unidad</label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Stock inicial</label>
              <Input type="number" min={0} step="0.01" value={stock} onChange={(e) => setStock(Number(e.target.value))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Stock mínimo</label>
              <Input type="number" min={0} step="0.01" value={minStock} onChange={(e) => setMinStock(Number(e.target.value))} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Costo unit. (COP)</label>
              <Input type="number" min={0} value={cost} onChange={(e) => setCost(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Proveedor</label>
            <Select
              value={supplier || NO_SUPPLIER}
              onValueChange={(v) => setSupplier(v === NO_SUPPLIER ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="Selecciona un proveedor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_SUPPLIER}>Sin proveedor</SelectItem>
                {supplierNames.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {supplierNames.length === 0 && (
              <p className="mt-1.5 text-xs text-muted-foreground">
                Aún no tienes proveedores registrados. Agrégalos en el módulo de Proveedores.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!valid}>{isEdit ? "Guardar cambios" : "Agregar insumo"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
