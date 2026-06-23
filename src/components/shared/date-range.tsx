"use client";

import { cn } from "@/lib/utils";

export const DATE_RANGES = [
  { id: "today", label: "Hoy" },
  { id: "week", label: "Semana" },
  { id: "month", label: "Mes" },
  { id: "year", label: "Año" },
] as const;

export type DateRangeId = (typeof DATE_RANGES)[number]["id"];

/** Selector de periodo con facilitadores (Hoy / Semana / Mes / Año). */
export function DateRangeFilter({ value, onChange, className }: { value: DateRangeId; onChange: (v: DateRangeId) => void; className?: string }) {
  return (
    <div className={cn("inline-flex rounded-lg border border-border p-0.5", className)}>
      {DATE_RANGES.map((r) => (
        <button
          key={r.id}
          onClick={() => onChange(r.id)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            value === r.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          )}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
