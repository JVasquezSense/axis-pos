"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, X, Plus, Trash2 } from "lucide-react";
import type { Category, Product, ProductTax, ProductVariation } from "@/types";
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
import { shrinkImageFile } from "@/lib/image";
import { useInventoryStore } from "@/store/inventory.store";
import { useFeatures } from "@/lib/features";
import { cn, formatCurrency } from "@/lib/utils";

const NO_SUPPLY = "none";

const KINDS: {
  id: NonNullable<Product["kind"]>;
  label: string;
  desc: string;
  examples: string;
}[] = [
  {
    id: "simple",
    label: "Producto simple",
    desc: "Se vende tal cual y descuenta su propio insumo del inventario.",
    examples: "Una Coca-Cola, una cerveza, una cajetilla de cigarrillos.",
  },
  {
    id: "compound",
    label: "Requiere insumos",
    desc: "Se prepara y descuenta los ingredientes de su ficha técnica.",
    examples: "Una hamburguesa, un roll de sushi, un cóctel.",
  },
];

/** "Cada venta descuenta 1 Und de Cerveza Poker." */
const SUPPLY_HINT = (qty: number, unit: string, name: string) =>
  `Cada venta descuenta ${qty} ${unit} de ${name}.`;

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
  // El tipo se elige ANTES del formulario: el de un producto simple es la mitad
  // de largo, y preguntarlo a mitad de camino obligaba a rehacer lo escrito.
  const [kindChosen, setKindChosen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const supplies = useInventoryStore((s) => s.items);
  const { has } = useFeatures();
  // Sin fichas técnicas (plan Mini) el costo del producto se escribe aquí: es el
  // único dato con el que se puede calcular margen.
  const hasRecipes = has("recipes");
  const hasInventory = has("inventory");

  // Reducida antes de guardarla: una foto de celular en base64 supera el límite
  // de cuerpo de petición del servidor y tumba el guardado entero.
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const image = await shrinkImageFile(file, { maxSide: 900, quality: 0.75 });
    setDraft((d) => (d ? { ...d, image } : d));
  };

  useEffect(() => {
    if (!open) return;
    setDraft(product ? structuredClone(product) : null);
    // Solo se pregunta al crear. Editar uno que ya existe entra directo al
    // formulario, con su tipo visible y cambiable arriba.
    const editing = Boolean(product?.name);
    setKindChosen(editing || !hasRecipes || Boolean(product?.isCombo));
  }, [open, product, hasRecipes]);

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

  const variations = draft.variations ?? [];
  const updateVariation = (index: number, patch: Partial<ProductVariation>) =>
    set({ variations: variations.map((v, i) => (i === index ? { ...v, ...patch } : v)) });
  const addVariation = () =>
    set({
      variations: [...variations, { id: `var-${Date.now().toString(36)}`, name: "", priceDelta: 0 }],
    });

  // Sin fichas técnicas todo es simple: no hay dónde definir los insumos.
  const kind = hasRecipes ? (draft.kind ?? "simple") : "simple";
  const isSimple = kind === "simple";

  const cost = Number(draft.cost ?? 0);
  const margin = draft.price > 0 && cost > 0 ? (draft.price - cost) / draft.price : null;
  const linkedItem = supplies.find((i) => String(i.id) === String(draft.inventoryId ?? ""));

  const chooseKind = (next: NonNullable<Product["kind"]>) => {
    // Una gaseosa no se prepara: dejarle los 10 minutos por defecto le pone al
    // KDS un tiempo objetivo que no existe.
    const prep = next === "simple" && isNew ? { prepMinutes: 0 } : {};
    set({ kind: next, ...prep });
    setKindChosen(true);
  };

  const save = () => {
    if (!draft.name.trim() || draft.price <= 0) return;
    // Un producto que pasa a "requiere insumos" no puede conservar el enlace
    // directo: descontaría el insumo Y los de la receta.
    onSave(isSimple ? { ...draft, kind } : { ...draft, kind, inventoryId: null });
    onOpenChange(false);
  };

  if (!kindChosen) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>¿Qué tipo de producto?</DialogTitle>
            <DialogDescription>Define cómo descuenta del inventario al venderse.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => chooseKind(k.id)}
                className="rounded-xl border border-border p-4 text-left transition-colors hover:border-primary hover:bg-primary/5"
              >
                <p className="text-sm font-semibold">{k.label}</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{k.desc}</p>
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground/80">{k.examples}</p>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88vh] max-w-lg flex-col">
        <DialogHeader>
          <DialogTitle>{isNew ? "Nuevo producto" : "Editar producto"}</DialogTitle>
          <DialogDescription>Define el plato que verá el cliente en el POS y la web.</DialogDescription>
        </DialogHeader>

        <div className="-mr-2 flex-1 space-y-4 overflow-y-auto pr-2">
          {/* Cómo descuenta inventario. Se eligió antes de entrar; aquí solo se
              recuerda, con la puerta abierta a cambiarlo. */}
          {hasRecipes && !draft.isCombo && (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-3 py-2">
              <p className="min-w-0 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{KINDS.find((k) => k.id === kind)?.label}</span>
                {" · "}
                {isSimple ? "descuenta su propio insumo" : "descuenta los insumos de su ficha técnica"}
              </p>
              <button
                type="button"
                onClick={() => setKindChosen(false)}
                className="shrink-0 text-xs font-medium text-primary hover:underline"
              >
                Cambiar
              </button>
            </div>
          )}

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

          {/* Una gaseosa no necesita que le describan los ingredientes. */}
          {!isSimple && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">Descripción</label>
              <Input value={draft.description} onChange={(e) => set({ description: e.target.value })} placeholder="Ingredientes principales…" />
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Precio de venta</label>
              <Input type="number" min={0} value={draft.price} onChange={(e) => set({ price: Number(e.target.value) })} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Costo de producción
              </label>
              <Input
                type="number"
                min={0}
                value={draft.cost ?? 0}
                onChange={(e) => set({ cost: Number(e.target.value) })}
                placeholder="0"
              />
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

          <div className={cn("grid gap-3", isSimple ? "grid-cols-1" : "grid-cols-2")}>
            {/* Un producto que no se prepara no tiene tiempo de preparación que
                darle al KDS. */}
            {!isSimple && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Preparación (min)</label>
                <Input type="number" min={0} value={draft.prepMinutes} onChange={(e) => set({ prepMinutes: Number(e.target.value) })} />
              </div>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium">Margen</label>
              <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm">
                {margin === null ? (
                  <span className="text-muted-foreground">Falta precio o costo</span>
                ) : (
                  <span className={margin < 0.3 ? "font-medium text-destructive" : "font-medium text-emerald-600 dark:text-emerald-400"}>
                    {formatCurrency(draft.price - cost)} · {Math.round(margin * 100)}%
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Insumo que descuenta al venderse. Lo que se vende tal cual (una
              cerveza, una cajetilla) no movía el kardex porque descontar exigía
              montarle una ficha técnica de un solo ingrediente. */}
          {hasInventory && !draft.isCombo && !isSimple && (
            <div className="rounded-xl border border-dashed border-border p-3">
              <p className="text-sm font-medium">Insumos de este producto</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Se definen en su ficha técnica: cada venta descuenta los ingredientes de la receta,
                con su cantidad y su merma.
              </p>
            </div>
          )}

          {hasInventory && !draft.isCombo && isSimple && (
            <div>
              <label className="mb-1.5 block text-sm font-medium">
                Descuenta del inventario <span className="text-muted-foreground">(opcional)</span>
              </label>
              <div className="flex gap-2">
                <Select
                  value={draft.inventoryId ? String(draft.inventoryId) : NO_SUPPLY}
                  onValueChange={(v) => set({ inventoryId: v === NO_SUPPLY ? null : v, inventoryQty: draft.inventoryQty ?? 1 })}
                >
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Sin descuento directo" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SUPPLY}>Sin descuento directo</SelectItem>
                    {supplies.map((i) => (
                      <SelectItem key={i.id} value={String(i.id)}>{i.name} ({i.unit})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {draft.inventoryId && (
                  <div className="w-32">
                    <Input
                      type="number"
                      min={0}
                      step="0.001"
                      value={draft.inventoryQty ?? 1}
                      onChange={(e) => set({ inventoryQty: Number(e.target.value) })}
                      title="Unidades del insumo por venta"
                    />
                  </div>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {linkedItem
                  ? SUPPLY_HINT(draft.inventoryQty ?? 1, linkedItem.unit, linkedItem.name)
                  : "Elige el insumo si quieres que la venta descuente stock."}
              </p>
            </div>
          )}

          {/* Variaciones: sin ficha técnica no había dónde definirlas. */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-sm font-medium">
                Variaciones <span className="text-muted-foreground">(opcional)</span>
              </label>
              <button
                type="button"
                onClick={addVariation}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar variación
              </button>
            </div>
            {variations.some((v) => v.inherited) && (
              <p className="mb-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Estas variaciones vienen de la ficha técnica; se editan desde la receta.
              </p>
            )}
            {variations.length === 0 ? (
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Sin variaciones. Por ejemplo: Doble +$8.000, Sin azúcar +$0.
              </p>
            ) : (
              <div className="space-y-2">
                {variations.map((v, i) => (
                  <div key={v.id} className={cn("flex items-end gap-2", v.inherited && "opacity-60")}>
                    <div className="flex-1">
                      <label className="mb-1 block text-[11px] text-muted-foreground">Nombre</label>
                      <Input
                        value={v.name}
                        onChange={(e) => updateVariation(i, { name: e.target.value })}
                        placeholder="Ej: Doble"
                        disabled={v.inherited}
                        className="h-9"
                      />
                    </div>
                    <div className="w-32">
                      <label className="mb-1 block text-[11px] text-muted-foreground">+/- precio</label>
                      <Input
                        type="number"
                        value={v.priceDelta}
                        onChange={(e) => updateVariation(i, { priceDelta: Number(e.target.value) })}
                        disabled={v.inherited}
                        className="h-9"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => set({ variations: variations.filter((_, x) => x !== i) })}
                      disabled={v.inherited}
                      className="mb-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                      title="Quitar variación"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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

          {!isSimple && (
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
          )}

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
