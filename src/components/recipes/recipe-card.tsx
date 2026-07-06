"use client";

import { motion } from "framer-motion";
import { Clock, Layers, MoreVertical, Pencil, Copy, Trash2, Package } from "lucide-react";
import type { Recipe } from "@/types";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { computeRecipeCost, STATION, RECIPE_STATUS, foodCostTone } from "@/lib/recipes";
import { cn, formatCurrency } from "@/lib/utils";

export function RecipeCard({
  recipe,
  index,
  invItems,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  recipe: Recipe;
  index: number;
  invItems?: import("@/types").InventoryItem[];
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const cost = computeRecipeCost(recipe, invItems);
  const station = STATION[recipe.station];
  const status = RECIPE_STATUS[recipe.status];
  const lowStock = cost.maxPortions <= 10;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className="group flex flex-col rounded-2xl border border-border bg-card transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-3 p-4">
        <button onClick={onEdit} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-3xl">
          {recipe.emoji}
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={onEdit} className="block text-left">
            <p className="truncate font-semibold leading-tight">{recipe.name || "Sin nombre"}</p>
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={cn("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium", station.className)}>
              {station.emoji} {station.label}
            </span>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100 data-[state=open]:opacity-100">
            <MoreVertical className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}><Pencil className="h-4 w-4" /> Editar</DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}><Copy className="h-4 w-4" /> Duplicar</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mx-4 grid grid-cols-3 gap-2 border-t border-border py-3">
        <Metric label="Precio" value={formatCurrency(recipe.price)} />
        <Metric label="Costo/porc." value={formatCurrency(cost.costPerPortion)} />
        <Metric label="Food cost" value={`${(cost.foodCostPct * 100).toFixed(0)}%`} className={foodCostTone(cost.foodCostPct)} />
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {recipe.prepMinutes} min</span>
        <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {recipe.variations.length} var.</span>
        <span className={cn("inline-flex items-center gap-1 font-medium", lowStock ? "text-destructive" : "text-emerald-500")}>
          <Package className="h-3.5 w-3.5" /> {cost.maxPortions} porc.
        </span>
      </div>
    </motion.div>
  );
}

function Metric({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="text-center">
      <p className={cn("text-sm font-bold", className)}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
