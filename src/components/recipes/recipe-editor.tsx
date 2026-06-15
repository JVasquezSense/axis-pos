"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, GripVertical, Wand2 } from "lucide-react";
import type { Recipe, Allergen, RecipeStation, RecipeStatus, RecipeDifficulty } from "@/types";
import { CATEGORIES, PRODUCTS } from "@/mock/menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { IngredientEditor } from "./ingredient-editor";
import { useRecipesStore, emptyVariation } from "@/store/recipes.store";
import { computeRecipeCost, STATION, ALLERGENS, foodCostTone, TARGET_FOOD_COST } from "@/lib/recipes";
import { cn, formatCurrency } from "@/lib/utils";

const STATIONS = Object.keys(STATION) as RecipeStation[];
const STATUSES: RecipeStatus[] = ["active", "draft", "archived"];
const DIFFS: RecipeDifficulty[] = ["easy", "medium", "hard"];
const ALLERGEN_KEYS = Object.keys(ALLERGENS) as Allergen[];

export function RecipeEditor({
  recipe,
  open,
  onOpenChange,
}: {
  recipe: Recipe | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { create, update } = useRecipesStore();
  const [draft, setDraft] = useState<Recipe | null>(recipe);
  const [tagInput, setTagInput] = useState("");
  const isNew = recipe ? !useRecipesStore.getState().recipes.some((r) => r.id === recipe.id) : false;

  useEffect(() => {
    if (open) setDraft(recipe ? structuredClone(recipe) : null);
  }, [open, recipe]);

  if (!draft) return null;
  const set = (patch: Partial<Recipe>) => setDraft({ ...draft, ...patch });
  const cost = computeRecipeCost(draft);

  const save = () => {
    if (!draft.name.trim()) {
      toast.error("La receta necesita un nombre");
      return;
    }
    if (isNew) {
      create(draft);
      toast.success("Receta creada", { description: draft.name });
    } else {
      update(draft);
      toast.success("Receta actualizada", { description: draft.name });
    }
    onOpenChange(false);
  };

  const toggleAllergen = (a: Allergen) =>
    set({ allergens: draft.allergens.includes(a) ? draft.allergens.filter((x) => x !== a) : [...draft.allergens, a] });

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !draft.tags.includes(t)) set({ tags: [...draft.tags, t] });
    setTagInput("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-5">
          <div className="flex items-center gap-3">
            <input
              value={draft.emoji}
              onChange={(e) => set({ emoji: e.target.value.slice(0, 2) })}
              className="h-12 w-12 rounded-xl border border-border bg-muted text-center text-2xl outline-none focus:border-primary"
            />
            <div className="flex-1">
              <DialogTitle>{isNew ? "Nueva receta" : "Editar receta"}</DialogTitle>
              <DialogDescription>Ficha técnica · costeo y consumo de inventario</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid max-h-[70vh] grid-cols-1 md:grid-cols-[1fr_240px]">
          {/* Formulario */}
          <div className="scrollbar-thin overflow-y-auto p-5">
            <Tabs defaultValue="general">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="ingredients">
                  Insumos {draft.ingredients.length > 0 && <Badge variant="secondary">{draft.ingredients.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="variations">
                  Variaciones {draft.variations.length > 0 && <Badge variant="secondary">{draft.variations.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="prep">Preparación</TabsTrigger>
              </TabsList>

              {/* GENERAL */}
              <TabsContent value="general" className="space-y-4">
                <Field label="Nombre de la receta">
                  <Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej: Axis Classic" />
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Categoría">
                    <Select value={draft.category} onValueChange={(v) => set({ category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Producto del menú">
                    <Select value={draft.productId ?? "none"} onValueChange={(v) => set({ productId: v === "none" ? undefined : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sin vincular</SelectItem>
                        {PRODUCTS.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Estación de cocina">
                    <Select value={draft.station} onValueChange={(v) => set({ station: v as RecipeStation })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATIONS.map((s) => (
                          <SelectItem key={s} value={s}>{STATION[s].emoji} {STATION[s].label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Estado">
                    <Select value={draft.status} onValueChange={(v) => set({ status: v as RecipeStatus })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>{s === "active" ? "Activa" : s === "draft" ? "Borrador" : "Archivada"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <Field label="Porciones">
                    <Input type="number" min={1} value={draft.portions} onChange={(e) => set({ portions: Math.max(Number(e.target.value), 1) })} />
                  </Field>
                  <Field label="Prep (min)">
                    <Input type="number" min={0} value={draft.prepMinutes} onChange={(e) => set({ prepMinutes: Number(e.target.value) })} />
                  </Field>
                  <Field label="Dificultad">
                    <Select value={draft.difficulty} onValueChange={(v) => set({ difficulty: v as RecipeDifficulty })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIFFS.map((d) => (
                          <SelectItem key={d} value={d}>{d === "easy" ? "Fácil" : d === "medium" ? "Media" : "Difícil"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field label="Precio de venta (COP)">
                  <Input type="number" min={0} value={draft.price} onChange={(e) => set({ price: Number(e.target.value) })} />
                </Field>

                <Field label="Alérgenos">
                  <div className="flex flex-wrap gap-1.5">
                    {ALLERGEN_KEYS.map((a) => {
                      const active = draft.allergens.includes(a);
                      return (
                        <button
                          key={a}
                          onClick={() => toggleAllergen(a)}
                          className={cn(
                            "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                            active ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                          )}
                        >
                          {ALLERGENS[a].emoji} {ALLERGENS[a].label}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Etiquetas">
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
                      placeholder="Añadir etiqueta…"
                      className="h-8 w-36"
                    />
                  </div>
                </Field>
              </TabsContent>

              {/* INSUMOS */}
              <TabsContent value="ingredients" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Selecciona qué insumos del inventario consume la receta. La <strong>merma %</strong> ajusta el costo por desperdicio.
                </p>
                <IngredientEditor value={draft.ingredients} onChange={(ingredients) => set({ ingredients })} />
              </TabsContent>

              {/* VARIACIONES */}
              <TabsContent value="variations" className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Cada variación ajusta el precio y puede agregar insumos extra (ej. doble carne, tamaño jarra).
                </p>
                {draft.variations.map((v) => (
                  <div key={v.id} className="rounded-xl border border-border p-3">
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={v.name}
                        onChange={(e) => set({ variations: draft.variations.map((x) => (x.id === v.id ? { ...x, name: e.target.value } : x)) })}
                        placeholder="Nombre de la variación"
                        className="h-9 flex-1"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">$</span>
                        <Input
                          type="number"
                          value={v.priceDelta}
                          onChange={(e) => set({ variations: draft.variations.map((x) => (x.id === v.id ? { ...x, priceDelta: Number(e.target.value) } : x)) })}
                          className="h-9 w-24"
                        />
                      </div>
                      <button
                        onClick={() => set({ variations: draft.variations.filter((x) => x.id !== v.id) })}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-2 pl-6">
                      <IngredientEditor
                        compact
                        value={v.extraIngredients}
                        onChange={(extraIngredients) => set({ variations: draft.variations.map((x) => (x.id === v.id ? { ...x, extraIngredients } : x)) })}
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => set({ variations: [...draft.variations, emptyVariation()] })}>
                  <Plus className="h-4 w-4" /> Agregar variación
                </Button>
              </TabsContent>

              {/* PREPARACIÓN */}
              <TabsContent value="prep" className="space-y-3">
                <p className="text-sm text-muted-foreground">Pasos de preparación que verá la cocina.</p>
                {draft.steps.map((s, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>
                    <Input
                      value={s}
                      onChange={(e) => set({ steps: draft.steps.map((x, idx) => (idx === i ? e.target.value : x)) })}
                      placeholder={`Paso ${i + 1}`}
                    />
                    <button
                      onClick={() => set({ steps: draft.steps.filter((_, idx) => idx !== i) })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => set({ steps: [...draft.steps, ""] })}>
                  <Plus className="h-4 w-4" /> Agregar paso
                </Button>
              </TabsContent>
            </Tabs>
          </div>

          {/* Panel de costeo en vivo */}
          <div className="hidden border-l border-border bg-muted/30 p-4 md:block">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-primary" /> Costeo en vivo
            </p>
            <div className="mt-3 space-y-3 text-sm">
              <CostRow label="Costo / porción" value={formatCurrency(cost.costPerPortion)} />
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Food cost</span>
                  <span className={cn("font-bold", foodCostTone(cost.foodCostPct))}>
                    {(cost.foodCostPct * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", cost.foodCostPct <= 0.3 ? "bg-emerald-500" : cost.foodCostPct <= 0.4 ? "bg-amber-500" : "bg-destructive")}
                    style={{ width: `${Math.min(cost.foodCostPct * 100, 100)}%` }}
                  />
                </div>
              </div>
              <CostRow label="Margen" value={formatCurrency(cost.margin)} accent />
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Precio sugerido ({Math.round(TARGET_FOOD_COST * 100)}% food cost)</p>
                <p className="text-lg font-bold">{formatCurrency(cost.suggestedPrice)}</p>
                <Button variant="outline" size="sm" className="mt-1.5 w-full" onClick={() => set({ price: cost.suggestedPrice })}>
                  <Wand2 className="h-3.5 w-3.5" /> Usar sugerido
                </Button>
              </div>
              <Separator />
              <div className="rounded-lg border border-border bg-background p-2.5">
                <p className="text-xs text-muted-foreground">Preparables con stock</p>
                <p className={cn("text-lg font-bold", cost.maxPortions <= 10 ? "text-destructive" : "text-emerald-500")}>
                  {cost.maxPortions} porciones
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 border-t border-border p-4">
          <div className="text-sm md:hidden">
            <span className="text-muted-foreground">Food cost </span>
            <span className={cn("font-bold", foodCostTone(cost.foodCostPct))}>{(cost.foodCostPct * 100).toFixed(0)}%</span>
            <span className="text-muted-foreground"> · {cost.maxPortions} porc.</span>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save}>{isNew ? "Crear receta" : "Guardar cambios"}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function CostRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("font-semibold", accent && "text-emerald-500")}>{value}</span>
    </div>
  );
}
