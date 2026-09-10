"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Receipt, Trash2, Pencil, Check, X } from "lucide-react";
import type { Tax } from "@/types";
import { useTaxesStore } from "@/store/taxes.store";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Draft = Omit<Tax, "id"> & { id?: string };

function emptyDraft(): Draft {
  return { name: "", type: "percent", rate: 0, isDefault: false, active: true };
}

/**
 * Impuestos del restaurante.
 *
 * El IVA del 8% estaba escrito en el código y se le cobraba a todos por igual.
 * Cada negocio liquida lo suyo —un bar suma impuesto al consumo por unidad, una
 * cafetería solo INC—, así que el catálogo es del restaurante.
 */
export function TaxesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { taxes, load, add, update, remove } = useTaxesStore();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      load();
      setDraft(null);
    }
  }, [open, load]);

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const valid = Boolean(draft?.name.trim()) && Number(draft?.rate ?? 0) >= 0;

  const save = async () => {
    if (!draft || !valid) return;
    setSaving(true);
    const payload = { ...draft, name: draft.name.trim(), rate: Number(draft.rate) };
    if (draft.id) await update(payload as Tax);
    else await add(payload);
    setSaving(false);
    setDraft(null);
    toast.success(draft.id ? "Impuesto actualizado" : "Impuesto creado", { description: payload.name });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Impuestos del restaurante
          </DialogTitle>
          <DialogDescription>
            Los marcados «Por defecto» se cobran en los productos que no tienen impuestos propios.
          </DialogDescription>
        </DialogHeader>

        <div className="-mr-2 flex-1 space-y-2 overflow-y-auto pr-2">
          {taxes.length === 0 && !draft && (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Sin impuestos configurados. Las cuentas se cobran sin impuestos hasta que agregues uno.
            </p>
          )}

          {taxes.map((t) => (
            <div key={t.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <span className="truncate">{t.name}</span>
                  {t.isDefault && <Badge variant="secondary" className="shrink-0">Por defecto</Badge>}
                  {t.active === false && <Badge variant="warning" className="shrink-0">Inactivo</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.type === "percent" ? `${t.rate}% sobre el precio` : `$${t.rate} por unidad vendida`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDraft({ ...t })}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted"
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  remove(String(t.id));
                  toast.success("Impuesto eliminado", { description: t.name });
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {draft ? (
            <div className="space-y-3 rounded-xl border-2 border-primary/40 bg-primary/[0.03] p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_9rem_7rem]">
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">Nombre</label>
                  <Input
                    autoFocus
                    value={draft.name}
                    onChange={(e) => set({ name: e.target.value })}
                    placeholder="Ej: IVA, Ipoconsumo"
                    className="h-9"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">Tipo</label>
                  <Select value={draft.type} onValueChange={(v) => set({ type: v as Tax["type"] })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percent">% Porcentual</SelectItem>
                      <SelectItem value="fixed">$ Por unidad</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] text-muted-foreground">
                    {draft.type === "percent" ? "Porcentaje" : "Valor (COP)"}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={draft.rate}
                    onChange={(e) => set({ rate: Number(e.target.value) })}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={!!draft.isDefault} onCheckedChange={(v) => set({ isDefault: v })} />
                  Por defecto
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={draft.active !== false} onCheckedChange={(v) => set({ active: v })} />
                  Activo
                </label>
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setDraft(null)}>
                    <X className="h-3.5 w-3.5" /> Cancelar
                  </Button>
                  <Button size="sm" onClick={save} disabled={!valid || saving}>
                    <Check className="h-3.5 w-3.5" /> {draft.id ? "Guardar" : "Agregar"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setDraft(emptyDraft())} className={cn(taxes.length > 0 && "mt-1")}>
              <Plus className="h-4 w-4" /> Nuevo impuesto
            </Button>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
