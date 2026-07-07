/**
 * Construye contextos COMPACTOS para Axis IA (GLM-4.5).
 * Objetivo: gastar los mínimos tokens posibles → datos pre-agregados, top-N,
 * cifras redondeadas y formato terso (no JSON verboso), solo lo relevante por modo.
 */
import type { Recipe, InventoryItem, InventoryMovement, RestaurantTable, KdsTicket } from "@/types";
import type { Reservation } from "@/store/reservations.store";
import type { Employee } from "@/store/employees.store";
import type { Purchase, Supplier } from "@/types";
import { computeRecipeCost } from "@/lib/recipes";
import { liveDayTotals, type SaleRecord } from "@/store/sales.store";

const k = (n: number) => n >= 1000 ? `$${Math.round(n / 1000)}k` : `$${Math.round(n)}`;

export type AiMode =
  | "chat"
  | "pricing"
  | "shift"
  | "inventory"
  | "waiter"
  | "menu_eng"
  | "reservations";

interface Stores {
  sales: SaleRecord[];
  recipes: Recipe[];
  inventory: InventoryItem[];
  movements: InventoryMovement[];
  tables: RestaurantTable[];
  tickets: KdsTicket[];
  reservations?: Reservation[];
  purchases?: Purchase[];
  suppliers?: Supplier[];
  employees?: Employee[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function topByKey<T>(arr: T[], key: (x: T) => number, n = 5): T[] {
  return [...arr].sort((a, b) => key(b) - key(a)).slice(0, n);
}

/** Top productos REALES desde SaleRecords (aproximado por total / items). */
function topProductsFromSales(records: SaleRecord[]): string {
  // Agrupamos por tipo de venta como proxy de "plato"
  // (sin items detallados, usamos método+tipo como agrupador)
  const byType = records.reduce<Record<string, number>>((acc, r) => {
    acc[r.saleType] = (acc[r.saleType] ?? 0) + r.total;
    return acc;
  }, {});
  return Object.entries(byType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([t, v]) => `${t}: ${k(v)}`)
    .join(", ");
}

// ─── Builders ────────────────────────────────────────────────────────────────

/** Resumen general del negocio (chat / resumen de turno). */
export function buildBrief(s: Stores): string {
  const d = liveDayTotals(s.sales);
  const occ = s.tables.filter((t) => t.status === "occupied" || t.status === "billing").length;
  const active = s.tickets.filter((t) => t.status !== "ready").length;

  // Ventas reales de la sesión por método
  const byMethod = s.sales.reduce<Record<string, number>>((acc, r) => {
    acc[r.method] = (acc[r.method] ?? 0) + r.total;
    return acc;
  }, {});
  const methodStr = Object.entries(byMethod).map(([m, v]) => `${m}:${k(v)}`).join(", ");

  // Meseros: cruce planilla vs ventas
  const byWaiter = s.sales.reduce<Record<string, { tip: number; sales: number }>>((acc, r) => {
    if (!r.waiter || r.waiter === "Sin asignar") return acc;
    acc[r.waiter] = acc[r.waiter] ?? { tip: 0, sales: 0 };
    acc[r.waiter].tip += r.tip;
    acc[r.waiter].sales += r.total;
    return acc;
  }, {});
  const topWaiter = Object.entries(byWaiter).sort(([, a], [, b]) => b.tip - a.tip)[0];
  const activeWaiters = (s.employees ?? []).filter((e) => e.role === "mesero" && e.active);
  const workingSet = new Set(Object.keys(byWaiter));
  const notWorkingToday = activeWaiters.filter((e) => !workingSet.has(e.name));

  // Food cost alto
  const highFC = s.recipes
    .map((r) => ({ n: r.name, fc: Math.round(computeRecipeCost(r).foodCostPct * 100) }))
    .filter((r) => r.fc > 35)
    .slice(0, 4)
    .map((r) => `${r.n} ${r.fc}%`)
    .join(", ");

  // Inventario completo por estado
  const invCrit = s.inventory.filter((i) => i.status === "critical");
  const invLow = s.inventory.filter((i) => i.status === "low");
  const invNormal = s.inventory.filter((i) => i.status === "normal");
  const invLines = [
    invCrit.length > 0 ? `CRÍTICO(${invCrit.length}): ${invCrit.map((i) => `${i.name} ${i.stock}${i.unit}`).join(", ")}` : "",
    invLow.length > 0 ? `Bajo(${invLow.length}): ${invLow.map((i) => `${i.name} ${i.stock}${i.unit}`).join(", ")}` : "",
    `Normal: ${invNormal.length} ítems`,
  ].filter(Boolean).join(" | ");

  // Proveedores completos
  const activeSupp = (s.suppliers ?? []).filter((sup) => sup.active);
  const suppStr = activeSupp.length > 0
    ? activeSupp.map((sup) => `${sup.name}(${sup.category}${sup.phone ? " ☎" + sup.phone : ""}${sup.email ? " ✉" + sup.email : ""})`).join("; ")
    : "";

  // Compras recientes
  const recentPurchases = (s.purchases ?? []).slice(0, 5);
  const purchStr = recentPurchases.length > 0
    ? recentPurchases.map((p) => `${p.code} ${p.supplierName} ${k(p.total)}`).join(", ")
    : "";

  // Recetas: count + avg food cost
  const avgFC = s.recipes.length > 0
    ? Math.round(s.recipes.reduce((sum, r) => sum + computeRecipeCost(r).foodCostPct * 100, 0) / s.recipes.length)
    : 0;

  // Reservaciones del día
  const todayRes = (s.reservations ?? []).filter(
    (r) => r.date === new Date().toISOString().slice(0, 10) && r.status !== "cancelled"
  );

  return [
    `Restaurante: Axis POS (es-CO, COP)`,
    `Hoy: ventas ${k(d.sales)}, ${d.orders} pedidos, ticket prom. ${k(d.avg)}`,
    methodStr ? `Métodos de pago: ${methodStr}` : "",
    `Mesas: ${occ}/${s.tables.length} ocupadas · Cocina: ${active} pedidos activos`,
    topWaiter ? `Mejor mesero hoy: ${topWaiter[0]} (propinas ${k(topWaiter[1].tip)}, ventas ${k(topWaiter[1].sales)})` : "",
    activeWaiters.length > 0 && notWorkingToday.length > 0
      ? `Meseros activos sin ventas hoy: ${notWorkingToday.map((e) => e.name).join(", ")}`
      : "",
    activeWaiters.length > 0
      ? `Planilla meseros: ${activeWaiters.length} activos (${workingSet.size} con ventas hoy)`
      : "",
    s.sales.length > 0 ? `Ventas por tipo: ${topProductsFromSales(s.sales)}` : "",
    highFC ? `Food cost alto (>35%): ${highFC}` : `Food cost: todo bajo control`,
    s.recipes.length > 0 ? `Recetas: ${s.recipes.length} platos, food cost promedio ${avgFC}%` : "",
    `Inventario (${s.inventory.length} ítems): ${invLines}`,
    suppStr ? `Proveedores activos (${activeSupp.length}): ${suppStr}` : "",
    purchStr ? `Últimas compras: ${purchStr}` : "",
    todayRes.length > 0
      ? `Reservaciones hoy: ${todayRes.length} (${todayRes.reduce((s, r) => s + r.guests, 0)} comensales)`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Recetas con food cost para el "doctor de precios". */
export function buildPricing(recipes: Recipe[]): string {
  const rows = recipes
    .map((r) => {
      const c = computeRecipeCost(r);
      return { n: r.name, price: r.price, fc: Math.round(c.foodCostPct * 100), sug: c.suggestedPrice, cat: r.category };
    })
    .sort((a, b) => b.fc - a.fc)
    .slice(0, 14)
    .map((r) => `${r.n}|${r.cat}|${k(r.price)}|${r.fc}%|sugerido:${k(r.sug)}`)
    .join("\n");
  return `Objetivo food cost: 30%.\nPlato|categoría|precio|foodcost|sugerido\n${rows}`;
}

/** Pronóstico de inventario: velocidad de consumo y días restantes. */
export function buildInventoryForecast(
  inventory: InventoryItem[],
  movements: InventoryMovement[],
  purchases?: Purchase[],
  suppliers?: Supplier[]
): string {
  const PERIOD = 20;
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
    .map((r) => `${r.n}|${r.stock}${r.unit}|${r.daily}/día|${r.days}d|proveedor:${r.sup}`)
    .join("\n");

  // Compras recientes
  const purchaseSummary = purchases && purchases.length > 0
    ? purchases.slice(0, 5).map((p) => `${p.code} ${p.supplierName} ${k(p.total)}`).join(", ")
    : "";
  const supplierList = suppliers && suppliers.length > 0
    ? suppliers.filter((s) => s.active).map((s) => `${s.name}(${s.category})`).join(", ")
    : "";

  return [
    `Insumo|stock|uso_diario|días_restantes|proveedor`,
    rows,
    purchaseSummary ? `\nÚltimas compras: ${purchaseSummary}` : "",
    supplierList ? `Proveedores activos: ${supplierList}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Análisis de meseros: propinas, ventas, pedidos. Cruza empleados registrados con ventas del turno. */
export function buildWaiterStats(records: SaleRecord[], employees?: Employee[]): string {
  // Estadísticas de ventas por mesero
  const stats: Record<string, { sales: number; tip: number; orders: number; tables: Set<number> }> = {};
  records.forEach((r) => {
    const w = r.waiter || "Sin asignar";
    stats[w] = stats[w] ?? { sales: 0, tip: 0, orders: 0, tables: new Set() };
    stats[w].sales += r.total;
    stats[w].tip += r.tip;
    stats[w].orders += 1;
    if (r.table) stats[w].tables.add(r.table);
  });

  const totalTips = records.reduce((s, r) => s + r.tip, 0);

  // Meseros registrados en el sistema
  const registeredWaiters = (employees ?? []).filter((e) => e.role === "mesero");
  const activeWaiters = registeredWaiters.filter((e) => e.active);
  const inactiveWaiters = registeredWaiters.filter((e) => !e.active);

  // Cruce: activos SIN ventas = posiblemente no están trabajando hoy
  const workingNames = new Set(Object.keys(stats).filter((n) => n !== "Sin asignar"));
  const notWorking = activeWaiters.filter((e) => !workingNames.has(e.name));
  const working = activeWaiters.filter((e) => workingNames.has(e.name));

  // Tabla de rendimiento (solo los que tienen ventas)
  const perfRows = Object.entries(stats)
    .filter(([w]) => w !== "Sin asignar")
    .sort(([, a], [, b]) => b.sales - a.sales)
    .map(([w, d], i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "  ";
      return `${medal} ${w}|ventas:${k(d.sales)}|propinas:${k(d.tip)}|pedidos:${d.orders}|mesas:${d.tables.size}`;
    })
    .join("\n");

  const unassigned = stats["Sin asignar"];

  return [
    registeredWaiters.length > 0
      ? `Planilla de meseros: ${activeWaiters.length} activos, ${inactiveWaiters.length} inactivos`
      : "Sin meseros registrados en el sistema (agregar en sección Empleados).",

    working.length > 0
      ? `Trabajando hoy (con ventas): ${working.map((e) => e.name).join(", ")}`
      : "",

    notWorking.length > 0
      ? `Activos SIN ventas hoy (posiblemente no están): ${notWorking.map((e) => e.name).join(", ")}`
      : "",

    inactiveWaiters.length > 0
      ? `Inactivos (no operan): ${inactiveWaiters.map((e) => e.name).join(", ")}`
      : "",

    records.length > 0
      ? `\nRendimiento del turno:\nMesero|ventas|propinas|pedidos|mesas_atendidas\n${perfRows}`
      : "\nSin ventas registradas en este turno.",

    unassigned
      ? `\nVentas sin mesero asignado: ${k(unassigned.sales)} (${unassigned.orders} pedidos) — asignar meseros en caja`
      : "",

    `\nTotal propinas del turno: ${k(totalTips)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Ingeniería de menú: popularidad × margen (matriz BCG). */
export function buildMenuEngineering(recipes: Recipe[], records: SaleRecord[]): string {
  if (recipes.length === 0) return "Sin recetas registradas.";

  // Sin historial de ventas por producto, usamos food cost como proxy del margen
  const items = recipes.map((r) => {
    const c = computeRecipeCost(r);
    const margin = c.margin; // precio - costo por porción
    const fc = Math.round(c.foodCostPct * 100);
    // Popularidad: recetas con food cost > 30% se consideran "menos rentables"
    // Usamos precio como proxy de demanda si no hay ventas por producto
    return {
      n: r.name,
      cat: r.category,
      price: r.price,
      fc,
      margin: Math.round(margin),
      cost: Math.round(c.costPerPortion),
      sug: Math.round(c.suggestedPrice),
    };
  });

  // Umbral de margen: mediana
  const margins = items.map((i) => i.margin).sort((a, b) => a - b);
  const medianMargin = margins[Math.floor(margins.length / 2)] ?? 0;
  // Umbral food cost: 30%
  const FCT = 30;

  const stars = items.filter((i) => i.margin >= medianMargin && i.fc <= FCT);
  const cows = items.filter((i) => i.margin >= medianMargin && i.fc > FCT);
  const puzzles = items.filter((i) => i.margin < medianMargin && i.fc <= FCT);
  const dogs = items.filter((i) => i.margin < medianMargin && i.fc > FCT);

  const fmt = (arr: typeof items) =>
    arr.map((i) => `${i.n}(${i.cat})|FC:${i.fc}%|margen:${k(i.margin)}`).join(", ") || "ninguno";

  return [
    `Ingeniería de menú — umbral margen: ${k(medianMargin)}, food cost: ${FCT}%`,
    ``,
    `⭐ ESTRELLAS (alto margen, bajo costo): ${fmt(stars)}`,
    `🐄 VACAS (alto margen, costo alto): ${fmt(cows)}`,
    `❓ PUZZLES (bajo margen, bajo costo — potencial): ${fmt(puzzles)}`,
    `🐕 PERROS (bajo margen, costo alto — revisar): ${fmt(dogs)}`,
    ``,
    `Total platos: ${items.length} | Margen mediano: ${k(medianMargin)} | Food cost prom: ${Math.round(items.reduce((s, i) => s + i.fc, 0) / (items.length || 1))}%`,
  ].join("\n");
}

/** KPIs de dashboard pre-calculados para contexto enriquecido. */
export function buildDashboardKpis(s: Stores): string {
  const d = liveDayTotals(s.sales);
  const occ = s.tables.filter((t) => t.status === "occupied" || t.status === "billing").length;
  const free = s.tables.filter((t) => t.status === "available").length;
  const active = s.tickets.filter((t) => t.status !== "ready").length;

  const invCrit = s.inventory.filter((i) => i.status === "critical");
  const invLow = s.inventory.filter((i) => i.status === "low");

  const highFC = s.recipes
    .map((r) => ({ n: r.name, fc: Math.round(computeRecipeCost(r).foodCostPct * 100) }))
    .filter((r) => r.fc > 35);

  const avgFC = s.recipes.length > 0
    ? Math.round(s.recipes.reduce((sum, r) => sum + computeRecipeCost(r).foodCostPct * 100, 0) / s.recipes.length)
    : 0;

  const totalTips = s.sales.reduce((sum, r) => sum + r.tip, 0);
  const byMethod = s.sales.reduce<Record<string, number>>((acc, r) => {
    acc[r.method] = (acc[r.method] ?? 0) + r.total;
    return acc;
  }, {});
  const topMethod = Object.entries(byMethod).sort(([, a], [, b]) => b - a)[0];

  const todayRes = (s.reservations ?? []).filter(
    (r) => r.date === new Date().toISOString().slice(0, 10) && r.status !== "cancelled"
  );

  return [
    `=== KPIs EN TIEMPO REAL ===`,
    `Ventas hoy: ${k(d.sales)} | Pedidos: ${d.orders} | Ticket promedio: ${k(d.avg)}`,
    topMethod ? `Método de pago #1: ${topMethod[0]} (${k(topMethod[1])})` : "",
    `Propinas totales: ${k(totalTips)}`,
    `Mesas: ${occ} ocupadas, ${free} libres de ${s.tables.length}`,
    `Cocina: ${active} pedidos activos`,
    `Inventario: ${invCrit.length} críticos, ${invLow.length} bajos de ${s.inventory.length}`,
    invCrit.length > 0 ? `⚠️ Críticos: ${invCrit.map((i) => `${i.name}(${i.stock}${i.unit})`).join(", ")}` : "",
    `Menú: ${s.recipes.length} platos, food cost promedio ${avgFC}%`,
    highFC.length > 0 ? `⚠️ Food cost alto: ${highFC.map((r) => `${r.n}(${r.fc}%)`).join(", ")}` : "",
    todayRes.length > 0 ? `Reservaciones hoy: ${todayRes.length} (${todayRes.reduce((s, r) => s + r.guests, 0)} comensales)` : "",
    `Empleados activos: ${(s.employees ?? []).filter((e) => e.active).length}`,
    `Proveedores activos: ${(s.suppliers ?? []).filter((sup) => sup.active).length}`,
  ].filter(Boolean).join("\n");
}

/** Briefing de reservaciones (hoy + próximas). */
export function buildReservationsBrief(reservations: Reservation[]): string {
  if (reservations.length === 0) return "Sin reservaciones registradas.";

  const today = new Date().toISOString().slice(0, 10);
  const todayRes = reservations
    .filter((r) => r.date === today && r.status !== "cancelled")
    .sort((a, b) => a.time.localeCompare(b.time));
  const upcoming = reservations
    .filter((r) => r.date > today && r.status !== "cancelled")
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 5);

  const todayStr = todayRes.length > 0
    ? todayRes.map((r) => `${r.time} ${r.name} x${r.guests} mesa${r.tableNumber} [${r.status}]${r.notes ? " nota:" + r.notes : ""}`).join("\n")
    : "Sin reservaciones hoy";
  const upStr = upcoming.length > 0
    ? upcoming.map((r) => `${r.date} ${r.time} ${r.name} x${r.guests}`).join("\n")
    : "Sin próximas reservaciones";
  const totalGuests = todayRes.reduce((s, r) => s + r.guests, 0);

  return [
    `Reservaciones HOY (${today}): ${todayRes.length} — ${totalGuests} comensales esperados`,
    todayStr,
    `\nPróximas reservaciones:`,
    upStr,
  ].join("\n");
}

// ─── Insights / Anomalías ──────────────────────────────────────────────────

export interface Insight {
  type: "inventory" | "employee" | "supplier";
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
}

export function detectInsights(s: Stores): Insight[] {
  const insights: Insight[] = [];

  // ── 1. Inventario: insumos sin movimiento que deberían tener consumo ──
  const recipesUsingItem = new Map<string, string[]>();
  s.recipes.forEach((r) => {
    (r.ingredients ?? []).forEach((ing) => {
      const list = recipesUsingItem.get(ing.inventoryId) ?? [];
      list.push(r.name);
      recipesUsingItem.set(ing.inventoryId, list);
    });
  });

  const movementsByItem = new Map<string, number>();
  s.movements.forEach((m) => {
    if (m.type === "salida") {
      movementsByItem.set(m.inventoryId, (movementsByItem.get(m.inventoryId) ?? 0) + Math.abs(m.quantity));
    }
  });

  s.inventory.forEach((item) => {
    const usedInRecipes = recipesUsingItem.get(item.id);
    const totalOut = movementsByItem.get(item.id) ?? 0;
    if (usedInRecipes && usedInRecipes.length > 0 && totalOut === 0 && item.stock > 0) {
      insights.push({
        type: "inventory",
        severity: "warning",
        title: `${item.name} sin consumo registrado`,
        detail: `Tiene ${item.stock}${item.unit} en stock y se usa en ${usedInRecipes.slice(0, 3).join(", ")} pero no hay salidas registradas. Posible descuadre o falta de registro de consumo.`,
      });
    }
  });

  // Insumos con stock que no se usa en ninguna receta (stock muerto)
  s.inventory.forEach((item) => {
    const usedInRecipes = recipesUsingItem.get(item.id);
    if ((!usedInRecipes || usedInRecipes.length === 0) && item.stock > 0) {
      insights.push({
        type: "inventory",
        severity: "info",
        title: `${item.name} no se usa en ninguna receta`,
        detail: `Tiene ${item.stock}${item.unit} en stock pero no está vinculado a ningún plato. Capital inmovilizado: ${k(item.cost * item.stock)}.`,
      });
    }
  });

  // ── 2. Empleados activos sin actividad ──
  const waiterSales = new Set<string>();
  s.sales.forEach((r) => {
    if (r.waiter && r.waiter !== "Sin asignar") waiterSales.add(r.waiter);
  });

  const activeEmployees = (s.employees ?? []).filter((e) => e.active);
  const idleEmployees = activeEmployees.filter((e) => !waiterSales.has(e.name));
  if (idleEmployees.length > 0 && s.sales.length > 0) {
    insights.push({
      type: "employee",
      severity: idleEmployees.length > 2 ? "warning" : "info",
      title: `${idleEmployees.length} empleado${idleEmployees.length > 1 ? "s" : ""} activo${idleEmployees.length > 1 ? "s" : ""} sin ventas`,
      detail: `${idleEmployees.map((e) => `${e.name} (${e.role})`).join(", ")} — están marcados como activos pero sin ventas en este turno. Verificar asistencia o asignación.`,
    });
  }

  // ── 3. Proveedores costosos: comparar precios de compra ──
  const pricesByItem = new Map<string, { supplier: string; unitCost: number; name: string }[]>();
  (s.purchases ?? []).forEach((p) => {
    p.lines.forEach((line) => {
      const list = pricesByItem.get(line.inventoryId) ?? [];
      list.push({ supplier: p.supplierName, unitCost: line.unitCost, name: line.name });
      pricesByItem.set(line.inventoryId, list);
    });
  });

  pricesByItem.forEach((entries, itemId) => {
    const suppliers = new Map<string, number>();
    entries.forEach((e) => suppliers.set(e.supplier, e.unitCost));
    if (suppliers.size < 2) return;
    const costs = Array.from(suppliers.values());
    const avg = costs.reduce((a, b) => a + b, 0) / costs.length;
    const min = Math.min(...costs);

    suppliers.forEach((cost, supplier) => {
      const pctAboveMin = ((cost - min) / min) * 100;
      if (pctAboveMin > 20 && cost > avg) {
        const itemName = entries.find((e) => e.supplier === supplier)?.name ?? itemId;
        insights.push({
          type: "supplier",
          severity: pctAboveMin > 40 ? "warning" : "info",
          title: `${supplier} cobra ${Math.round(pctAboveMin)}% más por ${itemName}`,
          detail: `Precio: ${k(cost)}/unidad vs ${k(min)}/unidad del proveedor más barato. Diferencia de ${k(cost - min)} por unidad. Evaluar renegociación o cambio.`,
        });
      }
    });
  });

  // Comparar costo unitario de inventario vs precio promedio de compras
  s.inventory.forEach((item) => {
    const purchases = pricesByItem.get(item.id);
    if (!purchases || purchases.length === 0) return;
    const avgPurchaseCost = purchases.reduce((s, p) => s + p.unitCost, 0) / purchases.length;
    const diff = ((item.cost - avgPurchaseCost) / avgPurchaseCost) * 100;
    if (diff > 30) {
      insights.push({
        type: "inventory",
        severity: "warning",
        title: `Costo de ${item.name} desactualizado`,
        detail: `Costo en inventario: ${k(item.cost)}/${item.unit} pero promedio de compras: ${k(avgPurchaseCost)}/${item.unit}. Diferencia del ${Math.round(diff)}%. Actualizar costo en inventario.`,
      });
    }
  });

  return insights;
}
