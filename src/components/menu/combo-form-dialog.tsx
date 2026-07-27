"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Minus, Trash2, Package } from "lucide-react";
import type { Category, ComboItem, Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn, formatCurrency } from "@/lib/utils";

const EMOJIS = ["🍱", "🍔", "🍟", "🥤", "🍕", "🌮", "🍗", "🍰", "🎉", "💥"];

/**
 * Alta/edición de un combo. Un combo es un producto vendible cuyo contenido
 * son otros productos; el backend descuenta el inventario de cada componente.
 */
export function ComboFormDialog({
  open,
  onOpenChange,
  combo,
  products,
  categories,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** null = crear uno nuevo */
  combo: Product | null;
  products: Product[];
  categories: Category[];
  onSave: (p: Product) => void;
}) {
  const isEdit = !!combo;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("🍱");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState(0);
  const [available, setAvailable] = useState(true);
  const [items, setItems] = useState<ComboItem[]>([]);
  const [picker, setPicker] = useState("");

  // Solo productos reales: un combo no puede contener otro combo.
  const selectable = useMemo(() => products.filter((p) => !p.isCombo), [products]);

  useEffect(() => {
    if (!open) return;
    setName(combo?.name ?? "");
    setDescription(combo?.description ?? "");
    setImage(combo?.image || "🍱");
    setCategory(String(combo?.category ?? categories[0]?.id ?? ""));
    setPrice(Number(combo?.price ?? 0));
    setAvailable(combo?.available ?? true);
    setItems(
      (combo?.comboItems ?? []).map((ci) => ({
        productId: ci.productId,
        quantity: ci.quantity,
        name: ci.name,
        price: Number(ci.price ?? 0),
      }))
    );
    setPicker("");
  }, [open, combo, categories]);

  const nameOf = (id: ComboItem["productId"]) =>
    selectable.find((p) => String(p.id) === String(id))?.name ?? "—";
  const priceOf = (id: ComboItem["productId"]) =>
    Number(selectable.find((p) => String(p.id) === String(id))?.price ?? 0);

  const componentsTotal = items.reduce((s, it) => s + priceOf(it.productId) * it.quantity, 0);
  const saving = componentsTotal - price;
  const savingPct = componentsTotal > 0 ? (saving / componentsTotal) * 100 : 0;

  const addItem = (productId: string) => {
    if (!productId) return;
    setItems((prev) =>
      prev.some((i) => String(i.productId) === String(productId))
        ? prev.map((i) => (String(i.productId) === String(productId) ? { ...i, quantity: i.quantity + 1 } : i))
        : [...prev, { productId, quantity: 1 }]
    );
    setPicker("");
  };

  const setQty = (productId: ComboItem["productId"], q: number) => {
    if (q < 1) return;
    setItems((prev) => prev.map((i) => (String(i.productId) === String(productId) ? { ...i, quantity: q } : i)));
  };

  const valid = name.trim().length > 0 && price > 0 && items.length > 0 && !!category;

  const submit = () => {
    if (!valid) return;
    onSave({
      ...(combo ?? {}),
      id: combo?.id ?? "",
      name: name.trim(),
      description: description.trim(),
      price,
      category,
      image,
      tags: combo?.tags ?? [],
      available,
      prepMinutes: combo?.prepMinutes ?? 10,
      popular: combo?.popular ?? false,
      isCombo: true,
      comboItems: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    } as Product);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-4 w-4" /> {isEdit ? "Editar combo" : "Nuevo combo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nombre del combo *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Combo Familiar" autoComplete="off" />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Descripción</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Lo que verá el cliente" autoComplete="off" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Categoría *</label>
              <Select value={String(category ?? "")} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="Elige categoría" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Icono</label>
              <div className="flex flex-wrap gap-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setImage(e)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg border text-lg transition-colors",
                      image === e ? "border-primary bg-primary/10" : "border-border hover:bg-muted"
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Componentes */}
          <div className="rounded-xl border border-border p-3">
            <p className="mb-2 text-sm font-semibold">Productos del combo *</p>
            {items.length === 0 && (
              <p className="mb-2 rounded-lg border border-dashed border-border py-4 text-center text-sm text-muted-foreground">
                Agrega los productos que incluye
              </p>
            )}
            <div className="space-y-2">
              {items.map((it) => (
                <div key={String(it.productId)} className="flex items-center gap-2">
                  <span className="flex-1 truncate text-sm">
                    {it.name ?? nameOf(it.productId)}
                    <span className="ml-1 text-xs text-muted-foreground">{formatCurrency(priceOf(it.productId))}</span>
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setQty(it.productId, it.quantity - 1)}
                      disabled={it.quantity <= 1}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-40"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold tabular-nums">{it.quantity}</span>
                    <button
                      onClick={() => setQty(it.productId, it.quantity + 1)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setItems((prev) => prev.filter((x) => String(x.productId) !== String(it.productId)))}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-border text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <Select value={picker} onValueChange={addItem}>
                <SelectTrigger><SelectValue placeholder="+ Agregar producto…" /></SelectTrigger>
                <SelectContent>
                  {selectable.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} · {formatCurrency(Number(p.price))}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Precio y ahorro */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Precio del combo (COP) *</label>
              <Input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
            </div>
            <div className="rounded-xl border border-border bg-muted/30 p-2.5">
              <p className="text-xs text-muted-foreground">Suma por separado</p>
              <p className="text-sm font-semibold">{formatCurrency(componentsTotal)}</p>
              <p className={cn("mt-1 text-xs font-medium", saving > 0 ? "text-emerald-600" : "text-destructive")}>
                {componentsTotal === 0
                  ? "—"
                  : saving > 0
                    ? `Ahorro ${formatCurrency(saving)} (${savingPct.toFixed(0)}%)`
                    : `Sin descuento (${formatCurrency(-saving)} más caro)`}
              </p>
            </div>
          </div>

          {componentsTotal > 0 && price > 0 && saving <= 0 && (
            <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
              El combo cuesta igual o más que comprar los productos por separado. Baja el precio para que sea atractivo.
            </p>
          )}

          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <span className="text-sm font-medium">Disponible en la carta</span>
            <Switch checked={available} onCheckedChange={setAvailable} />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={!valid}>{isEdit ? "Guardar cambios" : "Crear combo"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
