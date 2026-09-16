import type { Product } from "@/types";

/**
 * Un producto simple sin insumo vinculado se vende pero no descuenta nada del
 * inventario: hay que avisarlo en la carta y en el POS, como se avisa
 * "Agotado". Los combos y los compuestos (con ficha) no aplican.
 */
export function needsSupply(p: Product): boolean {
  return p.kind === "simple" && !p.isCombo && (p.inventoryId == null || p.inventoryId === "");
}
