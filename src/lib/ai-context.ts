/**
 * Construye contextos COMPACTOS para Axis IA (GLM-4.5).
 * Objetivo: gastar los mínimos tokens posibles → datos pre-agregados, top-N,
 * cifras redondeadas y formato terso (no JSON verboso), solo lo relevante por modo.
 */
import type { Recipe, InventoryItem, InventoryMovement, RestaurantTable, KdsTicket } from "@/types";
import { computeRecipeCost } from "@/lib/recipes";
import { liveDayTotals, type SaleRecord } from "@/store/sales.store";
import { DASHBOARD } from "@/mock/datasets";

const k = (n: number) => `$${Math.round(n / 1000)}k`; // miles, compacto

export type AiMode = "chat" | "pricing" | "shift" | "inventory";

interface Stores {
  sales: SaleRecord[];
  recipes: Recipe[];
  inventory: InventoryItem[];
  movements: InventoryMovement[];
  tables: RestaurantTable[];
  tickets: KdsTicket[];
}

/** Resumen general del negocio (chat / resumen de turno). */
export function buildBrief(s: Stores): string {
  const d = liveDayTotals(s.sales);
  const occ = s.tables.filter((t) => t.status === "occupied" || t.status === "billing").length;
  const active = s.tickets.filter((t) => t.status !== "ready").length;
  const top = DASHBOARD.topProducts.slice(0, 5).map((p) => `${p.name} ${p.units}u/${k(p.revenue)}`).join(", ");
  const highFC = s.recipes
    .map((r) => ({ n: r.name, fc: Math.round(computeRecipeCost(r).foodCostPct * 100) }))
    .filter((r) => r.fc > 35)
    .slice(0, 5)
    .map((r) => `${r.n} ${r.fc}%`)
    .join(", ");
  const crit = s.inventory.filter((i) => i.status !== "normal").map((i) => `${i.name} ${i.stock}${i.unit}`).join(", ");

  return [
    `Negocio: Demo Burger (es-CO, COP)`,
    `Hoy: ventas ${k(d.sales)}, ${d.orders} pedidos, ticket ${k(d.avg)}`,
    `Mesas ocupadas: ${occ}/${s.tables.length} · Cocina activa: ${active}`,
    `Top platos: ${top}`,
    highFC ? `Food cost alto (>35%): ${highFC}` : `Food cost: todo bajo control`,
    crit ? `Inventario bajo/crítico: ${crit}` : `Inventario: sin críticos`,
  ].join("\n");
}

/** Recetas con food cost para el "doctor de precios". */
export function buildPricing(recipes: Recipe[]): string {
  const rows = recipes
    .map((r) => {
      const c = computeRecipeCost(r);
      return { n: r.name, price: r.price, fc: Math.round(c.foodCostPct * 100), sug: c.suggestedPrice };
    })
    .sort((a, b) => b.fc - a.fc)
    .slice(0, 12)
    .map((r) => `${r.n}|${k(r.price)}|${r.fc}%|${k(r.sug)}`)
    .join("\n");
  return `Objetivo food cost: 30%.\nPlato|precio|foodcost|sugerido\n${rows}`;
}

/** Pronóstico de inventario: velocidad de consumo y días restantes (Fase 2). */
export function buildInventoryForecast(inventory: InventoryItem[], movements: InventoryMovement[]): string {
  const PERIOD = 20; // días que cubre el kardex aprox.
  const outBy: Record<string, number> = {};
  movements.forEach((m) => {
    if (m.type === "salida") outBy[m.inventoryId] = (outBy[m.inventoryId] ?? 0) + Math.abs(m.quantity);
  });
  const rows = inventory
    .map((i) => {
      const daily = (outBy[i.id] ?? 0) / PERIOD;
      const days = daily > 0 ? i.stock / daily : 999;
      return { n: i.name, stock: i.stock, unit: i.unit, daily: Math.round(daily * 100) / 100, days: Math.round(days * 10) / 10, sup: i.supplier };
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, 10)
    .map((r) => `${r.n}|${r.stock}${r.unit}|${r.daily}/día|${r.days}d|${r.sup}`)
    .join("\n");
  return `Insumo|stock|uso|días_restantes|proveedor\n${rows}`;
}
