"use client";

import { useMemo } from "react";
import { Download, Utensils } from "lucide-react";
import { RECIPES } from "@/mock/recipes";
import { RECIPE_SALES } from "@/mock/kardex";
import { effectiveQty, getInventoryItem } from "@/lib/recipes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportCsv } from "@/lib/export";
import { formatCurrency } from "@/lib/utils";

interface Consumed {
  name: string;
  unit: string;
  qty: number;
  cost: number;
}

function recipeConsumption(recipeId: string) {
  const recipe = RECIPES.find((r) => r.id === recipeId)!;
  const sold = RECIPE_SALES[recipeId] ?? 0;
  const portions = Math.max(recipe.portions, 1);
  const items: Consumed[] = recipe.ingredients.map((ing) => {
    const inv = getInventoryItem(ing.inventoryId);
    const qty = (effectiveQty(ing) / portions) * sold;
    return {
      name: ing.name || inv?.name || "—",
      unit: ing.unit || inv?.unit || "",
      qty: Math.round(qty * 100) / 100,
      cost: Math.round(qty * (inv?.cost ?? 0)),
    };
  });
  const total = items.reduce((s, i) => s + i.cost, 0);
  return { recipe, sold, items, total };
}

export function ConsumptionView() {
  const data = useMemo(() => RECIPES.map((r) => recipeConsumption(r.id)), []);
  const grandTotal = data.reduce((s, d) => s + d.total, 0);

  const exportAll = () => {
    const rows: (string | number)[][] = [];
    data.forEach((d) => {
      d.items.forEach((it) => {
        rows.push([d.recipe.name, d.sold, it.name, it.qty, it.unit, it.cost]);
      });
    });
    exportCsv("salida-insumos-por-plato-axis", ["Plato", "Uds vendidas", "Insumo", "Cantidad", "Unidad", "Costo"], rows);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Salida de insumos por plato</p>
          <p className="text-sm text-muted-foreground">
            Consumo teórico de materia prima según recetas y unidades vendidas del periodo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Costo total insumos</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(grandTotal)}</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportAll}>
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {data.map((d) => (
          <Card key={d.recipe.id}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="text-xl">{d.recipe.emoji}</span> {d.recipe.name}
              </CardTitle>
              <Badge variant="secondary" className="gap-1">
                <Utensils className="h-3 w-3" /> {d.sold} vendidos
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {d.items.map((it, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{it.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="tabular-nums">{it.qty} {it.unit}</span>
                      <span className="w-20 text-right font-medium">{formatCurrency(it.cost)}</span>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm font-semibold">Costo insumos del plato</span>
                <span className="text-base font-bold">{formatCurrency(d.total)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
