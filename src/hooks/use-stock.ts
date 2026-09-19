import { useMemo } from "react";
import { useInventoryStore } from "@/store/inventory.store";
import { useRecipesStore } from "@/store/recipes.store";
import { useMenuStore } from "@/store/menu.store";
import { useFeatures } from "@/lib/features";
import type { StockContext } from "@/lib/stock";

/**
 * Datos con los que se calcula cuántas unidades de un producto alcanzan.
 *
 * Si el restaurante no tiene el módulo de inventario, va sin insumos: sin nada
 * contra qué comparar `remainingUnits` no limita nada, que es justo lo que
 * queremos para un plan que no lleva inventario.
 */
export function useStockContext(): StockContext {
  const hasInventory = useFeatures().has("inventory");
  const items = useInventoryStore((s) => s.items);
  const recipes = useRecipesStore((s) => s.recipes);
  const products = useMenuStore((s) => s.products);

  return useMemo(
    () => ({ items: hasInventory ? items : [], recipes, products }),
    [hasInventory, items, recipes, products]
  );
}
