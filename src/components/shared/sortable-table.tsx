"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDir = "asc" | "desc";
export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

/** Estado de orden de una tabla + su toggle: mismo header = invierte, header nuevo = asc. */
export function useSort<K extends string>(initialKey: K, initialDir: SortDir = "asc") {
  const [sort, setSort] = useState<SortState<K>>({ key: initialKey, dir: initialDir });
  const toggleSort = (key: K) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  return { sort, toggleSort };
}

/** Numérico si ambos valores lo son; si no, alfabético en español (acentos/mayúsculas ignorados). */
export function compareValues(a: string | number, b: string | number, dir: SortDir): number {
  const cmp =
    typeof a === "number" && typeof b === "number"
      ? a - b
      : String(a).localeCompare(String(b), "es", { sensitivity: "base" });
  return dir === "asc" ? cmp : -cmp;
}

/** Encabezado de columna clicable que alterna asc/desc y muestra la flecha activa. */
export function SortHead<K extends string>({
  label,
  k,
  sort,
  onSort,
  align,
}: {
  label: string;
  k: K;
  sort: SortState<K>;
  onSort: (k: K) => void;
  align?: "right";
}) {
  const active = sort.key === k;
  return (
    <TableHead className={align === "right" ? "text-right" : ""}>
      <button
        type="button"
        onClick={() => onSort(k)}
        className={cn(
          "inline-flex items-center gap-1 transition-colors hover:text-foreground",
          align === "right" && "flex-row-reverse",
          active && "text-foreground"
        )}
      >
        {label}
        {active ? (
          sort.dir === "asc" ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}
