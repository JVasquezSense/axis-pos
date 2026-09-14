"use client";

import { useMemo } from "react";
import { Package } from "lucide-react";
import { formatCurrency, formatQty } from "@/lib/utils";

interface SaleLike {
  lines?: { name: string; quantity: number; total: number }[];
}

export interface SoldProduct {
  name: string;
  quantity: number;
  total: number;
}

/** Suma las líneas de todas las ventas: cuántas unidades y cuánto dinero por producto. */
export function aggregateSold(sales: SaleLike[]): SoldProduct[] {
  const acc = new Map<string, SoldProduct>();
  for (const s of sales) {
    for (const l of s.lines ?? []) {
      const key = l.name.trim();
      const cur = acc.get(key) ?? { name: key, quantity: 0, total: 0 };
      cur.quantity += Number(l.quantity) || 0;
      cur.total += Number(l.total) || 0;
      acc.set(key, cur);
    }
  }
  return [...acc.values()].sort((a, b) => b.quantity - a.quantity || b.total - a.total);
}

/**
 * "Qué se vendió": lista de productos con unidades e ingreso, ordenada por
 * unidades. Sirve para el turno en curso y para cada cierre del historial.
 */
export function SoldProducts({ sales, compact = false }: { sales: SaleLike[]; compact?: boolean }) {
  const rows = useMemo(() => aggregateSold(sales), [sales]);
  const units = rows.reduce((s, r) => s + r.quantity, 0);
  const max = rows[0]?.quantity ?? 1;

  if (rows.length === 0) {
    return <p className="py-4 text-center text-xs text-muted-foreground">Sin detalle de productos: estas ventas se cobraron antes de que se guardara el ticket línea por línea.</p>;
  }

  return (
    <div className={compact ? "space-y-1" : "space-y-1.5"}>
      {rows.map((r) => (
        <div key={r.name} className={compact ? "relative overflow-hidden rounded-lg border border-border px-3 py-1.5 text-xs" : "relative overflow-hidden rounded-lg border border-border px-4 py-2.5 text-sm"}>
          {/* Barra de fondo proporcional a las unidades: se ve de un vistazo qué manda. */}
          <div className="absolute inset-y-0 left-0 bg-primary/5" style={{ width: `${(r.quantity / max) * 100}%` }} />
          <div className="relative flex items-center gap-3">
            <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate font-medium">{r.name}</span>
            <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground">{formatQty(r.quantity)} und</span>
            <span className="w-24 shrink-0 text-right font-semibold tabular-nums">{formatCurrency(r.total)}</span>
          </div>
        </div>
      ))}
      <p className="px-1 pt-1 text-right text-[11px] text-muted-foreground">
        {rows.length} {rows.length === 1 ? "producto" : "productos"} · {formatQty(units)} unidades
      </p>
    </div>
  );
}
