"use client";

import { useMemo, useState } from "react";
import { Download, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { InventoryItem, InventoryMovement } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportCsv } from "@/lib/export";
import { cn, formatCurrency } from "@/lib/utils";

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
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");

  const byItem = useMemo(() => {
    const map = new Map<string, InventoryMovement[]>();
    movements.forEach((m) => {
      const arr = map.get(m.inventoryId) ?? [];
      arr.push(m);
      map.set(m.inventoryId, arr);
    });
    return map;
  }, [movements]);

  const summary: KardexSummary[] = useMemo(
    () =>
      items.map((item) => {
        const mv = byItem.get(item.id) ?? [];
        const inicial = mv.find((m) => m.type === "inicial")?.quantity ?? 0;
        const entradas = mv.filter((m) => m.type !== "inicial" && m.quantity > 0).reduce((s, m) => s + m.quantity, 0);
        const salidas = mv.filter((m) => m.quantity < 0).reduce((s, m) => s + Math.abs(m.quantity), 0);
        return { item, inicial, entradas, salidas, final: item.stock, value: item.stock * item.cost };
      }),
    [items, byItem]
  );

  const detail = byItem.get(selectedId) ?? [];
  const detailItem = items.find((i) => i.id === selectedId);

  const exportSummary = () => {
    exportCsv(
      "kardex-resumido-axis",
      ["Insumo", "Categoría", "Unidad", "Saldo inicial", "Entradas", "Salidas", "Saldo final", "Costo unit.", "Valor"],
      summary.map((s) => [s.item.name, s.item.category, s.item.unit, s.inicial, s.entradas, s.salidas, s.final, s.item.cost, Math.round(s.value)])
    );
  };

  const exportDetail = () => {
    if (!detailItem) return;
    exportCsv(
      `kardex-${detailItem.name.toLowerCase().replace(/\s+/g, "-")}`,
      ["Fecha", "Tipo", "Entrada", "Salida", "Saldo", "Costo unit.", "Motivo"],
      detail.map((m) => [m.date, TYPE_BADGE[m.type].label, m.quantity > 0 ? m.quantity : "", m.quantity < 0 ? Math.abs(m.quantity) : "", m.balance, m.unitCost, m.reason])
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
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              {items.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Button variant="outline" size="sm" onClick={mode === "summary" ? exportSummary : exportDetail}>
          <Download className="h-4 w-4" /> Exportar
        </Button>
      </div>

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
                  <TableCell className="text-right text-muted-foreground">{s.inicial} {s.item.unit}</TableCell>
                  <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">+{s.entradas}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">−{s.salidas}</TableCell>
                  <TableCell className="text-right font-semibold">{s.final} {s.item.unit}</TableCell>
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
              <p className="text-xs text-muted-foreground">Movimientos del periodo · saldo final {detailItem?.stock} {detailItem?.unit}</p>
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
              {detail.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{m.date}</TableCell>
                  <TableCell><Badge variant={TYPE_BADGE[m.type].variant}>{TYPE_BADGE[m.type].label}</Badge></TableCell>
                  <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                    {m.quantity > 0 ? <span className="inline-flex items-center gap-1"><ArrowDownToLine className="h-3 w-3" />{m.quantity}</span> : "—"}
                  </TableCell>
                  <TableCell className="text-right font-medium text-destructive">
                    {m.quantity < 0 ? <span className="inline-flex items-center gap-1"><ArrowUpFromLine className="h-3 w-3" />{Math.abs(m.quantity)}</span> : "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">{m.balance}</TableCell>
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
