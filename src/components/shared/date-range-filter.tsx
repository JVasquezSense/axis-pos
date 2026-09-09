"use client";

import { CalendarRange } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, todayLocal } from "@/lib/utils";

export interface DateRange {
  from: string; // YYYY-MM-DD
  to: string;
}

/** Rango que abarca todo: sin filtro. */
export const ALL_TIME: DateRange = { from: "", to: "" };

/** Últimos `days` días contando hoy. */
export function lastDays(days: number): DateRange {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));
  return { from: todayLocal(from), to: todayLocal(to) };
}

/** ¿La fecha del movimiento cae dentro del rango? Rango vacío = todo pasa. */
export function inRange(date: string | undefined, range: DateRange): boolean {
  if (!range.from && !range.to) return true;
  const day = dayOf(date);
  if (!day) return true; // fecha ilegible: no esconder el movimiento
  if (range.from && day < range.from) return false;
  if (range.to && day > range.to) return false;
  return true;
}

/** "YYYY-MM-DD" del valor que venga (ISO del backend o texto suelto). */
function dayOf(value?: string): string | null {
  if (!value) return null;
  const iso = value.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : todayLocal(parsed);
}

const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: "Hoy", range: () => lastDays(1) },
  { label: "7 días", range: () => lastDays(7) },
  { label: "30 días", range: () => lastDays(30) },
  { label: "Todo", range: () => ALL_TIME },
];

/**
 * Filtro de fechas del kardex y de la salida por plato: sin él, un insumo con
 * meses de movimientos era ilegible y no se podía cuadrar un periodo contra la
 * contabilidad.
 */
export function DateRangeFilter({
  value,
  onChange,
  className,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}) {
  const isActive = (p: { label: string; range: () => DateRange }) => {
    const r = p.range();
    return r.from === value.from && r.to === value.to;
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <CalendarRange className="h-4 w-4 shrink-0 text-muted-foreground" />
      <Input
        type="date"
        aria-label="Desde"
        value={value.from}
        max={value.to || undefined}
        onChange={(e) => onChange({ ...value, from: e.target.value })}
        className="h-9 w-[9.5rem]"
      />
      <span className="text-xs text-muted-foreground">a</span>
      <Input
        type="date"
        aria-label="Hasta"
        value={value.to}
        min={value.from || undefined}
        onChange={(e) => onChange({ ...value, to: e.target.value })}
        className="h-9 w-[9.5rem]"
      />
      <div className="inline-flex rounded-lg border border-border p-0.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => onChange(p.range())}
            className={cn(
              "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              isActive(p) ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Texto del periodo para encabezados y exportaciones. */
export function describeRange(range: DateRange): string {
  if (!range.from && !range.to) return "todo el histórico";
  if (range.from && range.to) return `${range.from} a ${range.to}`;
  return range.from ? `desde ${range.from}` : `hasta ${range.to}`;
}
