"use client";

import { useMemo, useState } from "react";
import { Download, ClipboardCheck, AlertTriangle, Scale } from "lucide-react";
import { toast } from "sonner";
import type { InventoryItem, PhysicalCount } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exportCsv } from "@/lib/export";
import { cn, formatCurrency } from "@/lib/utils";
import { useInventoryStore } from "@/store/inventory.store";

export function PhysicalCountView({ items, counts }: { items: InventoryItem[]; counts: PhysicalCount[] }) {
  const applyPhysicalCount = useInventoryStore((s) => s.applyPhysicalCount);
  // Conteo físico editable
  const [physical, setPhysical] = useState<Record<string, number>>(() =>
    Object.fromEntries(counts.map((c) => [c.inventoryId, c.physical]))
  );

  const rows = useMemo(() => {
    return items.map((item) => {
      const theoretical = item.stock;
      const phys = physical[item.id] ?? theoretical;
      const diff = Math.round((phys - theoretical) * 100) / 100;
      const valueDiff = Math.round(diff * item.cost);
      return { item, theoretical, phys, diff, valueDiff };
    });
  }, [items, physical]);

  const summary = useMemo(() => {
    const withDiff = rows.filter((r) => Math.abs(r.diff) > 0.001);
    const shrinkage = rows.filter((r) => r.diff < 0).reduce((s, r) => s + r.valueDiff, 0);
    const surplus = rows.filter((r) => r.diff > 0).reduce((s, r) => s + r.valueDiff, 0);
    return { counted: rows.length, withDiff: withDiff.length, shrinkage, surplus, net: shrinkage + surplus };
  }, [rows]);

  const exportCount = () => {
    exportCsv(
      "conteo-fisico-axis",
      ["Insumo", "Categoría", "Unidad", "Teórico", "Físico", "Diferencia", "Valor diferencia", "Estado"],
      rows.map((r) => [
        r.item.name, r.item.category, r.item.unit, r.theoretical, r.phys, r.diff, r.valueDiff,
        r.diff === 0 ? "Cuadra" : r.diff < 0 ? "Faltante" : "Sobrante",
      ])
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={ClipboardCheck} tone="text-primary" label="Insumos contados" value={`${summary.counted}`} />
        <SummaryCard icon={AlertTriangle} tone="text-warning" label="Con diferencia" value={`${summary.withDiff}`} />
        <SummaryCard icon={Scale} tone="text-destructive" label="Merma (faltante)" value={formatCurrency(Math.abs(summary.shrinkage))} />
        <SummaryCard icon={Scale} tone="text-emerald-500" label="Diferencia neta" value={formatCurrency(summary.net)} />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <p className="font-semibold">Control de inventario vs. reporte físico</p>
            <p className="text-xs text-muted-foreground">Ajusta el conteo físico de cada insumo para revisar diferencias</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCount}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button
              size="sm"
              disabled={summary.withDiff === 0}
              onClick={() => {
                const adjustments = rows
                  .filter((r) => Math.abs(r.diff) > 0.001)
                  .map((r) => ({ inventoryId: r.item.id, physical: r.phys }));
                const applied = applyPhysicalCount(adjustments);
                toast.success("Conteo guardado", { description: `${applied} ajustes aplicados al inventario y kardex` });
              }}
            >
              Guardar conteo
            </Button>
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Insumo</TableHead>
              <TableHead className="text-right">Teórico</TableHead>
              <TableHead className="text-right">Físico</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.item.id}>
                <TableCell>
                  <p className="font-medium">{r.item.name}</p>
                  <p className="text-xs text-muted-foreground">{r.item.category}</p>
                </TableCell>
                <TableCell className="text-right text-muted-foreground">{r.theoretical} {r.item.unit}</TableCell>
                <TableCell className="text-right">
                  <Input
                    type="number"
                    step="0.01"
                    value={r.phys}
                    onChange={(e) => setPhysical((p) => ({ ...p, [r.item.id]: Number(e.target.value) }))}
                    className="ml-auto h-8 w-24 text-right"
                  />
                </TableCell>
                <TableCell className={cn("text-right font-semibold", r.diff < 0 ? "text-destructive" : r.diff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                  {r.diff > 0 ? "+" : ""}{r.diff} {r.item.unit}
                </TableCell>
                <TableCell className={cn("text-right", r.valueDiff < 0 ? "text-destructive" : r.valueDiff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                  {r.valueDiff !== 0 ? formatCurrency(r.valueDiff) : "—"}
                </TableCell>
                <TableCell>
                  {r.diff === 0 ? (
                    <Badge variant="success">Cuadra</Badge>
                  ) : r.diff < 0 ? (
                    <Badge variant="destructive">Faltante</Badge>
                  ) : (
                    <Badge variant="warning">Sobrante</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl bg-muted", tone)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </Card>
  );
}
