"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, ArrowDownToLine, ArrowUpFromLine, ChevronDown, Search } from "lucide-react";
import type { InventoryItem, InventoryMovement } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportCsv } from "@/lib/export";
import { DateRangeFilter, inRange, describeRange, ALL_TIME, type DateRange } from "@/components/shared/date-range-filter";
import { cn, formatCurrency, formatDateTime, formatQty, alphabetical } from "@/lib/utils";

const TYPE_BADGE: Record<InventoryMovement["type"], { label: string; variant: "success" | "warning" | "secondary" | "destructive" }> = {
  inicial: { label: "Inicial", variant: "secondary" },
  entrada: { label: "Entrada", variant: "success" },
  salida: { label: "Salida", variant: "destructive" },
  ajuste: { label: "Ajuste", variant: "warning" },
};

interface KardexSummary {
  item: InventoryItem;
  inicial: number;
  entradas: number;
  salidas: number;
  final: number;
  value: number;
}

export function KardexView({ items, movements }: { items: InventoryItem[]; movements: InventoryMovement[] }) {
  const [mode, setMode] = useState<"summary" | "detail">("summary");
  const [selectedId, setSelectedId] = useState(String(items[0]?.id ?? ""));
  // Por defecto todo el histórico: es el saldo que cuadra con el stock actual.
  const [range, setRange] = useState<DateRange>(ALL_TIME);

  const filtered = Boolean(range.from || range.to);

  const inPeriod = useMemo(
    () => movements.filter((m) => inRange(m.date, range)),
    [movements, range]
  );

  const byItem = useMemo(() => {
    const map = new Map<string, InventoryMovement[]>();
    inPeriod.forEach((m) => {
      const key = String(m.inventoryId);
      const arr = map.get(key) ?? [];
      arr.push(m);
      map.set(key, arr);
    });
    return map;
  }, [inPeriod]);

  const summary: KardexSummary[] = useMemo(
    () =>
      // Alfabético: el kardex se lee buscando un insumo por nombre.
      [...items]
        .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
        .map((item) => {
        const mv = byItem.get(String(item.id)) ?? [];
        const inicial = mv.find((m) => m.type === "inicial")?.quantity ?? 0;
        const entradas = Math.round(mv.filter((m) => m.type !== "inicial" && m.quantity > 0).reduce((s, m) => s + m.quantity, 0) * 1000) / 1000;
        const salidas = Math.round(mv.filter((m) => m.quantity < 0).reduce((s, m) => s + Math.abs(m.quantity), 0) * 1000) / 1000;
        // Con un periodo acotado el saldo del corte es el del último movimiento
        // del periodo, no el stock de hoy: si no, las columnas no cuadran.
        const last = mv.length > 0 ? mv[mv.length - 1].balance : item.stock;
        const final = filtered ? last : item.stock;
        return { item, inicial, entradas, salidas, final, value: final * item.cost };
      }),
    [items, byItem, filtered]
  );

  const detail = byItem.get(selectedId) ?? [];
  const detailItem = items.find((i) => String(i.id) === selectedId);

  const exportSummary = () => {
    exportCsv(
      `kardex-resumido-axis${filtered ? `-${range.from || "inicio"}_${range.to || "hoy"}` : ""}`,
      ["Insumo", "Categoría", "Unidad", "Saldo inicial", "Entradas", "Salidas", "Saldo final", "Costo unit.", "Valor"],
      summary.map((s) => [s.item.name, s.item.category, s.item.unit, s.inicial, s.entradas, s.salidas, s.final, s.item.cost, Math.round(s.value)])
    );
  };

  const exportDetail = () => {
    if (!detailItem) return;
    exportCsv(
      `kardex-${detailItem.name.toLowerCase().replace(/\s+/g, "-")}`,
      ["Fecha", "Tipo", "Entrada", "Salida", "Saldo", "Costo unit.", "Motivo"],
      detail.map((m) => [formatDateTime(m.date), TYPE_BADGE[m.type].label, m.quantity > 0 ? m.quantity : "", m.quantity < 0 ? Math.abs(m.quantity) : "", m.balance, m.unitCost, m.reason])
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-border p-0.5">
          <button onClick={() => setMode("summary")} className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", mode === "summary" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            Resumido
          </button>
          <button onClick={() => setMode("detail")} className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", mode === "detail" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
            Por insumo
          </button>
        </div>
        {mode === "detail" && (
          <ItemCombobox items={items} value={selectedId} onChange={setSelectedId} />
        )}
        <Button variant="outline" size="sm" onClick={mode === "summary" ? exportSummary : exportDetail}>
          <Download className="h-4 w-4" /> Exportar
        </Button>
      </div>

      <DateRangeFilter value={range} onChange={setRange} />

      {mode === "summary" ? (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead className="text-right">Saldo inicial</TableHead>
                <TableHead className="text-right">Entradas</TableHead>
                <TableHead className="text-right">Salidas</TableHead>
                <TableHead className="text-right">Saldo final</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map((s) => (
                <TableRow key={s.item.id} className="cursor-pointer" onClick={() => { setSelectedId(s.item.id); setMode("detail"); }}>
                  <TableCell>
                    <p className="font-medium">{s.item.name}</p>
                    <p className="text-xs text-muted-foreground">{s.item.category}</p>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{formatQty(s.inicial)} {s.item.unit}</TableCell>
                  <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">+{formatQty(s.entradas)} {s.item.unit}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">−{formatQty(s.salidas)} {s.item.unit}</TableCell>
                  <TableCell className="text-right font-semibold">{formatQty(s.final)} {s.item.unit}</TableCell>
                  <TableCell className="text-right">{formatCurrency(s.value)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <p className="font-semibold">{detailItem?.name}</p>
              <p className="text-xs text-muted-foreground">
                {describeRange(range)} · saldo final {formatQty(filtered ? (detail.at(-1)?.balance ?? detailItem?.stock) : detailItem?.stock)} {detailItem?.unit}
              </p>
            </div>
            <Badge variant="secondary">{detail.length} mov.</Badge>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Entrada</TableHead>
                <TableHead className="text-right">Salida</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Motivo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    Sin movimientos en {describeRange(range)}.
                  </TableCell>
                </TableRow>
              )}
              {detail.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(m.date)}</TableCell>
                  <TableCell><Badge variant={TYPE_BADGE[m.type].variant}>{TYPE_BADGE[m.type].label}</Badge></TableCell>
                  <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                    {m.quantity > 0 ? <span className="inline-flex items-center gap-1"><ArrowDownToLine className="h-3 w-3" />{formatQty(m.quantity)}</span> : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-destructive">
                    {m.quantity < 0 ? <span className="inline-flex items-center gap-1"><ArrowUpFromLine className="h-3 w-3" />{formatQty(Math.abs(m.quantity))}</span> : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{formatQty(m.balance)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}

function ItemCombobox({ items, value, onChange }: { items: InventoryItem[]; value: string; onChange: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = items.find((i) => String(i.id) === value);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const filtered = alphabetical(items.filter((i) => i.name.toLowerCase().includes(query.toLowerCase())), (i) => i.name);

  return (
    <div ref={ref} className="relative w-full sm:w-64">
      <button
        type="button"
        onClick={() => { setOpen(!open); setQuery(""); }}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors hover:bg-muted"
      >
        <span className="truncate">{selected?.name ?? "Seleccionar insumo"}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
          <div className="flex items-center border-b border-border px-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar insumo..."
              className="h-9 border-0 shadow-none focus-visible:ring-0"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">Sin resultados</p>
            ) : (
              filtered.map((i) => (
                <button
                  key={i.id}
                  type="button"
                  onClick={() => { onChange(String(i.id)); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent",
                    String(i.id) === value && "bg-accent font-medium"
                  )}
                >
                  {i.name}
                  <span className="ml-auto text-xs text-muted-foreground">{i.category}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
