"use client";

import { Plus, Trash2 } from "lucide-react";
import type { RecipeIngredient } from "@/types";
import { INVENTORY } from "@/mock/datasets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { emptyIngredient } from "@/store/recipes.store";
import { ingredientCost } from "@/lib/recipes";
import { formatCurrency } from "@/lib/utils";

/** Editor de la lista de insumos consumidos (selecciona qué se gasta). */
export function IngredientEditor({
  value,
  onChange,
  compact,
}: {
  value: RecipeIngredient[];
  onChange: (next: RecipeIngredient[]) => void;
  compact?: boolean;
}) {
  const update = (id: string, patch: Partial<RecipeIngredient>) =>
    onChange(value.map((ing) => (ing.id === id ? { ...ing, ...patch } : ing)));

  const pickItem = (id: string, inventoryId: string) => {
    const item = INVENTORY.find((i) => i.id === inventoryId);
    if (!item) return;
    update(id, { inventoryId, name: item.name, unit: item.unit });
  };

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {compact ? "Sin insumos extra" : "Agrega los insumos que consume esta receta"}
        </p>
      )}

      {value.map((ing) => (
        <div key={ing.id} className="grid grid-cols-12 items-center gap-2 rounded-xl border border-border p-2">
          <div className="col-span-12 sm:col-span-5">
            <Select value={ing.inventoryId} onValueChange={(v) => pickItem(ing.id, v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Insumo del inventario" />
              </SelectTrigger>
              <SelectContent>
                {INVENTORY.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-4 sm:col-span-2">
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={0}
                step="0.001"
                value={ing.quantity}
                onChange={(e) => update(ing.id, { quantity: Number(e.target.value) })}
                className="h-9"
              />
              <span className="w-8 shrink-0 text-xs text-muted-foreground">{ing.unit || "—"}</span>
            </div>
          </div>
          <div className="col-span-4 sm:col-span-2">
            <div className="flex items-center gap-1" title="Merma / desperdicio">
              <Input
                type="number"
                min={0}
                max={90}
                value={Math.round(ing.waste * 100)}
                onChange={(e) => update(ing.id, { waste: Math.min(Number(e.target.value), 90) / 100 })}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground">%</span>
            </div>
          </div>
          <div className="col-span-3 text-right text-sm font-semibold sm:col-span-2">
            {formatCurrency(ingredientCost(ing))}
          </div>
          <div className="col-span-1 flex justify-end">
            <button
              onClick={() => onChange(value.filter((i) => i.id !== ing.id))}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={() => onChange([...value, emptyIngredient()])}>
        <Plus className="h-4 w-4" /> {compact ? "Insumo extra" : "Agregar insumo"}
      </Button>
    </div>
  );
}
