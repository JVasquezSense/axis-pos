"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, alphabetical } from "@/lib/utils";

export interface SearchableOption {
  value: string;
  label: string;
  /** Texto secundario a la derecha (unidad, categoría). */
  hint?: string;
}

/** Sin tildes ni mayúsculas, para que "salmon" encuentre "Salmón". */
function fold(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
}

/**
 * Desplegable con buscador.
 *
 * Con cuarenta insumos, elegir uno en una lista sin filtro es recorrerla
 * entera cada vez. Aquí se escribe y se va filtrando; Enter elige el primero.
 */
export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar…",
  searchPlaceholder = "Escribe para filtrar…",
  emptyText = "Sin resultados",
  allowClear = false,
  className,
  disabled,
}: {
  value: string | null | undefined;
  onChange: (value: string) => void;
  options: SearchableOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  allowClear?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === String(value ?? ""));
  // Siempre alfabético: una lista larga sin orden obliga a leerla entera.
  const sorted = useMemo(() => alphabetical(options, (o) => o.label), [options]);
  const filtered = useMemo(() => {
    const q = fold(query.trim());
    if (!q) return sorted;
    return sorted.filter((o) => fold(o.label).includes(q) || (o.hint ? fold(o.hint).includes(q) : false));
  }, [sorted, query]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      // Foco tras pintar el menú.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => setCursor(0), [query]);

  const pick = (opt: SearchableOption) => {
    onChange(opt.value);
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50",
          !selected && "text-muted-foreground"
        )}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <span className="flex shrink-0 items-center gap-1">
          {allowClear && selected && !disabled && (
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
              title="Quitar"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </span>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[14rem] rounded-md border border-border bg-popover shadow-md">
          <div className="flex items-center border-b border-border px-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, filtered.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
                if (e.key === "Enter") { e.preventDefault(); if (filtered[cursor]) pick(filtered[cursor]); }
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder={searchPlaceholder}
              className="h-9 border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="scrollbar-thin max-h-60 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              filtered.map((o, i) => (
                <button
                  key={o.value}
                  type="button"
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => pick(o)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors",
                    i === cursor && "bg-accent",
                    o.value === selected?.value && "font-medium"
                  )}
                >
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 text-xs text-muted-foreground">{o.hint}</span>}
                  {o.value === selected?.value && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
