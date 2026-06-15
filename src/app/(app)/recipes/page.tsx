"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Plus, Search, DollarSign, Percent, Package, Layers } from "lucide-react";
import type { Recipe } from "@/types";
import { useRecipesStore, emptyRecipe } from "@/store/recipes.store";
import { computeRecipeCost, STATION } from "@/lib/recipes";
import { CATEGORIES } from "@/mock/menu";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RecipeCard } from "@/components/recipes/recipe-card";
import { RecipeEditor } from "@/components/recipes/recipe-editor";
import { cn, formatCurrency } from "@/lib/utils";

export default function RecipesPage() {
  const { recipes, duplicate, remove } = useRecipesStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [station, setStation] = useState("all");
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Recipe | null>(null);

  const filtered = useMemo(
    () =>
      recipes.filter(
        (r) =>
          (category === "all" || r.category === category) &&
          (station === "all" || r.station === station) &&
          (query === "" || r.name.toLowerCase().includes(query.toLowerCase()))
      ),
    [recipes, category, station, query]
  );

  const summary = useMemo(() => {
    if (!recipes.length) return { count: 0, avgFood: 0, avgMargin: 0, lowStock: 0 };
    const costs = recipes.map((r) => computeRecipeCost(r));
    return {
      count: recipes.length,
      avgFood: (costs.reduce((s, c) => s + c.foodCostPct, 0) / costs.length) * 100,
      avgMargin: costs.reduce((s, c) => s + c.margin, 0) / costs.length,
      lowStock: costs.filter((c) => c.maxPortions <= 10).length,
    };
  }, [recipes]);

  const openNew = () => {
    setEditing(emptyRecipe());
    setEditorOpen(true);
  };
  const openEdit = (r: Recipe) => {
    setEditing(r);
    setEditorOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recetas · Fichas técnicas"
        description="Costeo, variaciones y consumo de inventario"
        icon={<BookOpen className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> Nueva receta
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={Layers} tone="text-primary" label="Recetas" value={`${summary.count}`} />
        <SummaryCard icon={Percent} tone="text-amber-500" label="Food cost promedio" value={`${summary.avgFood.toFixed(0)}%`} />
        <SummaryCard icon={DollarSign} tone="text-emerald-500" label="Margen promedio" value={formatCurrency(summary.avgMargin)} />
        <SummaryCard icon={Package} tone="text-destructive" label="Con stock crítico" value={`${summary.lowStock}`} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Buscar receta…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={station} onValueChange={setStation}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Estación" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las estaciones</SelectItem>
            {(Object.keys(STATION) as (keyof typeof STATION)[]).map((s) => (
              <SelectItem key={s} value={s}>{STATION[s].emoji} {STATION[s].label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<BookOpen />}
          title="No hay recetas"
          description="Crea tu primera ficha técnica para costear y controlar el consumo de inventario."
          action={<Button onClick={openNew}><Plus className="h-4 w-4" /> Nueva receta</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r, i) => (
            <RecipeCard
              key={r.id}
              recipe={r}
              index={i}
              onEdit={() => openEdit(r)}
              onDuplicate={() => {
                duplicate(r.id);
                toast.success("Receta duplicada");
              }}
              onDelete={() => setToDelete(r)}
            />
          ))}
        </div>
      )}

      <RecipeEditor recipe={editing} open={editorOpen} onOpenChange={setEditorOpen} />

      {/* Confirmación de borrado */}
      <Dialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar receta</DialogTitle>
            <DialogDescription>
              ¿Seguro que deseas eliminar <strong>{toDelete?.name}</strong>? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (toDelete) {
                  remove(toDelete.id);
                  toast.success("Receta eliminada");
                }
                setToDelete(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-muted", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
