"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import type { Category, Product } from "@/types";
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
              <Select value={draft.category} onValueChange={(v) => set({ category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
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
