import type { InventoryItem, InventoryMovement, PhysicalCount } from "@/types";
import { INVENTORY } from "./datasets";

const BASE = new Date("2026-06-15T12:00:00");
const r = (n: number) => Math.round(n * 100) / 100;

function dateLabel(daysAgo: number): string {
  const d = new Date(BASE);
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

/** Genera un kardex consistente cuyo saldo final coincide con el stock actual. */
function genMovements(item: InventoryItem): InventoryMovement[] {
  const m: InventoryMovement[] = [];
  let bal = 0;
  let seq = 0;
  const push = (daysAgo: number, type: InventoryMovement["type"], qty: number, reason: string) => {
    bal = r(bal + qty);
    m.push({
      id: `${item.id}-mv${seq++}`,
      inventoryId: item.id,
      date: dateLabel(daysAgo),
      type,
      quantity: r(qty),
      balance: bal,
      unitCost: item.cost,
      reason,
    });
  };

  const inicial = r(item.minStock * 2.4);
  push(21, "inicial", inicial, "Inventario inicial del periodo");
  push(16, "entrada", r(item.minStock * 1.8), `Compra OC-1042 · ${item.supplier}`);
  push(12, "salida", -r(inicial * 0.5), "Consumo por ventas");
  push(7, "entrada", r(item.minStock * 1.0), `Compra OC-1071 · ${item.supplier}`);
  push(4, "salida", -r(bal * 0.3), "Consumo por ventas");

  const diff = r(item.stock - bal);
  if (Math.abs(diff) > 0.01) {
    if (diff < 0) push(1, "salida", diff, "Consumo por ventas");
    else push(1, "ajuste", diff, "Ajuste por conteo");
  }
  return m;
}

export const MOVEMENTS: InventoryMovement[] = INVENTORY.flatMap(genMovements);

/** Conteo físico simulado con algunas diferencias (mermas/sobrantes). */
const OFFSETS = [0, -0.3, 0, 0.2, -0.5, 0, 0, -0.1, 0.4, 0, -0.2, 0];
export const PHYSICAL_COUNTS: PhysicalCount[] = INVENTORY.map((i, idx) => ({
  inventoryId: i.id,
  theoretical: i.stock,
  physical: Math.max(r(i.stock + OFFSETS[idx % OFFSETS.length]), 0),
}));

/** Unidades vendidas por receta (para salida de insumos por plato). */
export const RECIPE_SALES: Record<string, number> = {
  r1: 87,
  r2: 52,
  r3: 24,
  r4: 18,
  r5: 76,
  r6: 64,
};
