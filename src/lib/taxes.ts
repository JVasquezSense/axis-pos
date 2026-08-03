import type { OrderLine, Product, ProductTax } from "@/types";

/**
 * Impuestos por producto.
 *
 * Un mismo producto puede llevar varios: una cerveza paga IVA porcentual y, en
 * Colombia, además un impuesto al consumo fijo por unidad. Cobrar un único
 * porcentaje sobre toda la cuenta deja mal liquidado el segundo.
 *
 * Un producto sin impuestos propios usa el impuesto general del restaurante,
 * que es como funcionaba todo antes de esto.
 */

export const DEFAULT_TAX_NAME = "IVA";

export interface TaxTotal {
  name: string;
  amount: number;
}

/** Impuesto de una línea, ya multiplicado por la cantidad. */
function lineTax(tax: ProductTax, unitBase: number, quantity: number): number {
  if (tax.type === "fixed") return tax.rate * quantity;
  return unitBase * quantity * (tax.rate / 100);
}

/** Precio unitario de la línea incluyendo modificadores. */
export function lineUnitPrice(line: OrderLine): number {
  return line.unitPrice + line.modifiers.reduce((s, m) => s + m.price, 0);
}

/**
 * Impuestos de una cuenta, desglosados por nombre.
 *
 * @param fallbackRate  Porcentaje general (0.08 = 8%) para los productos que no
 *                      declaran impuestos propios.
 * @param exempt        Venta exenta (cortesía, consumo interno): sin impuestos.
 */
export function computeTaxes(
  lines: OrderLine[],
  fallbackRate: number,
  exempt = false
): { totals: TaxTotal[]; total: number } {
  if (exempt) return { totals: [], total: 0 };

  const byName = new Map<string, number>();
  const add = (name: string, amount: number) =>
    byName.set(name, (byName.get(name) ?? 0) + amount);

  for (const line of lines) {
    const unit = lineUnitPrice(line);
    const taxes = line.product.taxes ?? [];
    if (taxes.length === 0) {
      add(DEFAULT_TAX_NAME, unit * line.quantity * fallbackRate);
      continue;
    }
    for (const tax of taxes) add(tax.name || DEFAULT_TAX_NAME, lineTax(tax, unit, line.quantity));
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
  return taxes
    .map((t) => `${t.name} ${t.type === "percent" ? `${t.rate}%` : `$${t.rate}`}`)
    .join(" + ");
}

export function emptyTax(): ProductTax {
  return { id: `tax-${Date.now().toString(36)}`, name: "", type: "percent", rate: 0 };
}
