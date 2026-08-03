"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X, Plus, Trash2 } from "lucide-react";
import type { Category, Product, ProductTax } from "@/types";
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
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductImage } from "@/components/shared/product-image";
import { emptyTax } from "@/lib/taxes";

function isImageUrl(src: string) {
  return src.startsWith("data:") || src.startsWith("http") || src.startsWith("/") || src.startsWith("blob:");
}

export function ProductFormDialog({
  product,
  categories,
  open,
  onOpenChange,
  onSave,
}: {
  product: Product | null;
  categories: Category[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (p: Product) => void;
}) {
  const [draft, setDraft] = useState<Product | null>(product);
  const [tagInput, setTagInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      if (draft) setDraft({ ...draft, image: result });
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (open) setDraft(product ? structuredClone(product) : null);
  }, [open, product]);

  if (!draft) return null;
  const set = (patch: Partial<Product>) => setDraft({ ...draft, ...patch });
  const isNew = !product || !product.name;

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !draft.tags.includes(t)) set({ tags: [...draft.tags, t] });
    setTagInput("");
  };

  const updateTax = (index: number, patch: Partial<ProductTax>) =>
    set({ taxes: (draft.taxes ?? []).map((t, i) => (i === index ? { ...t, ...patch } : t)) });

  const save = () => {
    if (!draft.name.trim() || draft.price <= 0) return;
    onSave(draft);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isNew ? "Nuevo producto" : "Editar producto"}</DialogTitle>
          <DialogDescription>Define el plato que verá el cliente en el POS y la web.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Foto / Icono</label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <div className="relative h-16 w-16">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="h-16 w-16 overflow-hidden rounded-xl border border-border bg-muted hover:border-primary transition-colors"
                  title="Subir foto"
                >
                  {isImageUrl(draft.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={draft.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                      <span className="text-2xl leading-none">{draft.image || "🍽️"}</span>
                      <ImagePlus className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </button>
                {isImageUrl(draft.image) && (
                  <button
                    type="button"
                    onClick={() => set({ image: "🍽️" })}
                    className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              {!isImageUrl(draft.image) && (
                <input
                  value={draft.image}
                  onChange={(e) => set({ image: e.target.value.slice(0, 2) })}
                  className="mt-1 h-7 w-16 rounded border border-border bg-muted text-center text-xs outline-none focus:border-primary"
                  placeholder="emoji"
                />
              )}
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium">Nombre</label>
              <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej: Axis Classic" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Descripción</label>
            <Input value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="Ingredientes principales…" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Precio (COP)</label>
              <Input type="number" min={0} value={draft.price} onChange={(e) => set({ price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Prep (min)</label>
              <Input type="number" min={0} value={draft.prepMinutes} onChange={(e) => set({ prepMinutes: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Categoría</label>
              {/* La API devuelve el id de categoria como number y los SelectItem
                  usan String(id): sin coercionar, el Select no encuentra la
                  opcion y se muestra vacio. */}
              <Select value={String(draft.category ?? "")} onValueChange={(v) => set({ category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Impuestos: un campo por defecto y tantos como haga falta. Una cerveza
              lleva IVA porcentual y un impuesto al consumo fijo por unidad. */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium">
                Impuestos <span className="text-muted-foreground">(opcional)</span>
              </label>
              <button
                type="button"
                onClick={() => set({ taxes: [...(draft.taxes ?? []), emptyTax()] })}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar impuesto
              </button>
            </div>

            {(draft.taxes ?? []).length === 0 ? (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Sin impuestos propios: se cobra el impuesto general del restaurante.
              </p>
            ) : (
              <div className="space-y-2">
                {(draft.taxes ?? []).map((tax, i) => (
                  <div key={tax.id} className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] text-muted-foreground">Nombre</label>
                      <Input
                        value={tax.name}
                        onChange={(e) => updateTax(i, { name: e.target.value })}
                        placeholder="Ej: IVA"
                        className="h-9"
                      />
                    </div>
                    <div className="w-32">
                      <label className="mb-1 block text-[11px] text-muted-foreground">Tipo</label>
                      <Select
                        value={tax.type}
                        onValueChange={(v) => updateTax(i, { type: v as ProductTax["type"] })}
                      >
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percent">% Porcentual</SelectItem>
                          <SelectItem value="fixed">$ Por unidad</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-28">
                      <label className="mb-1 block text-[11px] text-muted-foreground">
                        {tax.type === "percent" ? "Porcentaje" : "Valor (COP)"}
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={tax.rate}
                        onChange={(e) => updateTax(i, { rate: Number(e.target.value) })}
                        className="h-9"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => set({ taxes: (draft.taxes ?? []).filter((_, x) => x !== i) })}
                      className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title="Quitar impuesto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Etiquetas</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {draft.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium">
                  {t}
                  <button onClick={() => set({ tags: draft.tags.filter((x) => x !== t) })} className="text-muted-foreground hover:text-destructive">×</button>
                </span>
              ))}
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                placeholder="Añadir…"
                className="h-8 w-28"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Disponible</span>
              <Switch checked={draft.available} onCheckedChange={(v) => set({ available: v })} />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Destacado ★</span>
              <Switch checked={!!draft.popular} onCheckedChange={(v) => set({ popular: v })} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={save} disabled={!draft.name.trim() || draft.price <= 0}>
            {isNew ? "Crear producto" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
