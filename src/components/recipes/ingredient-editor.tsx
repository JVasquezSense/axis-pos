"use client";

import { Plus, Trash2 } from "lucide-react";
import type { RecipeIngredient } from "@/types";
import { INVENTORY } from "@/mock/datasets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { emptyIngredient } from "@/store/recipes.store";
import { useInventoryStore } from "@/store/inventory.store";
import { ingredientCost } from "@/lib/recipes";
import { formatCurrency } from "@/lib/utils";

const UNIT_DEFAULTS: Record<string, number> = {
  kg: 0.2, g: 200, lb: 0.4, oz: 6,
  L: 0.2, ml: 200, cl: 20,
  und: 1, pza: 1, paq: 1, bolsa: 1, caja: 1, lata: 1,
  porcion: 1, taza: 0.5,
};

function suggestQty(unit: string): number {
  const lower = unit.toLowerCase();
  return UNIT_DEFAULTS[unit] ?? UNIT_DEFAULTS[lower] ?? 1;
}

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
  const storeItems = useInventoryStore((s) => s.items);
  const items = storeItems.length > 0 ? storeItems : INVENTORY;

  const update = (id: string, patch: Partial<RecipeIngredient>) =>
    onChange(value.map((ing) => (ing.id === id ? { ...ing, ...patch } : ing)));

  const pickItem = (id: string, inventoryId: string) => {
    const item = items.find((i) => i.id === inventoryId);
    if (!item) return;
    const qty = suggestQty(item.unit);
    update(id, { inventoryId, name: item.name, unit: item.unit, quantity: qty });
  };

  return (
    <div className="space-y-2">
      {value.length === 0 && (
        <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          {compact ? "Sin insumos extra" : "Agrega los insumos que consume esta receta"}
        </p>
      )}

      {value.map((ing) => (
        <div key={ing.id} className="space-y-2 rounded-xl border border-border p-3">
          {/* Fila 1: insumo + eliminar */}
          <div className="flex items-center gap-2">
            <Select value={ing.inventoryId} onValueChange={(v) => pickItem(ing.id, v)}>
              <SelectTrigger className="h-9 flex-1">
                <SelectValue placeholder="Selecciona el insumo del inventario" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.name} <span className="text-muted-foreground">· {i.unit}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={() => onChange(value.filter((i) => i.id !== ing.id))}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              title="Quitar insumo"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          {/* Fila 2: cantidad + merma + costo (anchos cómodos) */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="mb-1 flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                <span>Cantidad{ing.unit ? ` (${ing.unit})` : ""}</span>
                {ing.inventoryId && (
                  <button
                    type="button"
                    onClick={() => update(ing.id, { quantity: suggestQty(ing.unit) })}
                    className="text-[10px] text-primary underline-offset-2 hover:underline"
                    title="Restaurar cantidad sugerida"
                  >
                    sugerida: {suggestQty(ing.unit)}
                  </button>
                )}
              </label>
              <Input
                type="number"
                min={0}
                step="0.001"
                value={ing.quantity}
                onChange={(e) => update(ing.id, { quantity: Number(e.target.value) })}
                className="h-9"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground" title="Desperdicio">
                Merma (%)
              </label>
              <Input
                type="number"
                min={0}
                max={90}
                value={Math.round(ing.waste * 100)}
                onChange={(e) => update(ing.id, { waste: Math.min(Number(e.target.value), 90) / 100 })}
                className="h-9"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-muted-foreground">Costo</label>
              <div className="flex h-9 items-center justify-end rounded-lg border border-border bg-muted/40 px-3 text-sm font-semibold">
                {formatCurrency(ingredientCost(ing))}
              </div>
            </div>
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={() => onChange([...value, emptyIngredient()])}>
        <Plus className="h-4 w-4" /> {compact ? "Insumo extra" : "Agregar insumo"}
      </Button>
    </div>
  );
}
