import type { OrderLine, Product, ProductTax, Tax } from "@/types";

/**
 * Impuestos de la cuenta.
 *
 * Un mismo producto puede llevar varios: una cerveza paga IVA porcentual y, en
 * Colombia, además un impuesto al consumo fijo por unidad. Cobrar un único
 * porcentaje sobre toda la cuenta deja mal liquidado el segundo.
 *
 * El producto que no declara impuestos propios usa los que el restaurante haya
 * marcado por defecto en su catálogo. Ya no hay ningún IVA escrito en el
 * código: si el restaurante no configura ninguno, la cuenta no lleva impuestos.
 */

export interface TaxTotal {
  name: string;
  amount: number;
}

/** Impuesto de una línea, ya multiplicado por la cantidad. */
function lineTax(tax: ProductTax | Tax, unitBase: number, quantity: number): number {
  if (tax.type === "fixed") return Number(tax.rate) * quantity;
  return unitBase * quantity * (Number(tax.rate) / 100);
}

/** Precio unitario de la línea incluyendo modificadores. */
export function lineUnitPrice(line: OrderLine): number {
  return line.unitPrice + line.modifiers.reduce((s, m) => s + m.price, 0);
}

/**
 * Resuelve el impuesto del producto contra el catálogo del restaurante.
 *
 * El producto guarda una copia (nombre, tipo y tarifa) del momento en que se
 * eligió. Si el impuesto sigue existiendo, manda el del catálogo: cuando suben
 * el IVA, el administrador lo cambia en un sitio y no producto por producto.
 */
function resolve(tax: ProductTax, catalog: Tax[]): ProductTax | Tax {
  const current = catalog.find((t) => String(t.id) === String(tax.id));
  return current && current.active !== false ? current : tax;
}

/**
 * Impuestos de una cuenta, desglosados por nombre.
 *
 * @param catalog  Impuestos del restaurante; los marcados por defecto se
 *                 aplican a los productos sin impuestos propios.
 * @param exempt   Venta exenta (cortesía, consumo interno): sin impuestos.
 */
export function computeTaxes(
  lines: OrderLine[],
  catalog: Tax[],
  exempt = false
): { totals: TaxTotal[]; total: number } {
  if (exempt) return { totals: [], total: 0 };

  const fallback = catalog.filter((t) => t.active !== false && t.isDefault);
  const byName = new Map<string, number>();
  const add = (name: string, amount: number) =>
    byName.set(name, (byName.get(name) ?? 0) + amount);

  for (const line of lines) {
    const unit = lineUnitPrice(line);
    const own = line.product.taxes ?? [];
    const applied = own.length > 0 ? own.map((t) => resolve(t, catalog)) : fallback;
    for (const tax of applied) {
      if (!tax.name) continue;
      add(tax.name, lineTax(tax, unit, line.quantity));
    }
  }

  const totals = [...byName.entries()]
    .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
    .filter((t) => t.amount !== 0);
  return { totals, total: totals.reduce((s, t) => s + t.amount, 0) };
}

/** Texto corto para mostrar en la carta: "IVA 19% + Ipoconsumo $400". */
export function describeTaxes(product: Product): string {
  const taxes = product.taxes ?? [];
  if (taxes.length === 0) return "";
  return taxes.map(describeTax).join(" + ");
}

/** "IVA 19%" o "Ipoconsumo $400". */
export function describeTax(tax: ProductTax | Tax): string {
  // La API serializa los decimales como string ("8.00"), y "IVA 8.00%" se lee
  // como si alguien hubiera tecleado de más.
  const rate = Number(tax.rate);
  return `${tax.name} ${tax.type === "percent" ? `${rate}%` : `$${rate}`}`;
}

export function emptyTax(): ProductTax {
  return { id: `tax-${Date.now().toString(36)}`, name: "", type: "percent", rate: 0 };
}
