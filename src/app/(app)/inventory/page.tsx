"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Boxes, Download, Search, Plus, AlertTriangle, TrendingDown, Package } from "lucide-react";
import type { InventoryItem, StockStatus } from "@/types";
import { inventoryService } from "@/services/inventory.service";
import { useAsync } from "@/hooks/use-async";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { STOCK_STATUS } from "@/lib/status";
import { cn, formatCurrency } from "@/lib/utils";

export default function InventoryPage() {
  const { data, loading } = useAsync(() => inventoryService.getItems());
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  const categories = useMemo(
    () => Array.from(new Set((data ?? []).map((i) => i.category))),
    [data]
  );

  const filtered = useMemo(() => {
    return (data ?? []).filter(
      (i) =>
        (status === "all" || i.status === status) &&
        (category === "all" || i.category === category) &&
        (query === "" || i.name.toLowerCase().includes(query.toLowerCase()))
    );
  }, [data, status, category, query]);

  const summary = useMemo(() => {
    const items = data ?? [];
    return {
      total: items.length,
      critical: items.filter((i) => i.status === "critical").length,
      low: items.filter((i) => i.status === "low").length,
      value: items.reduce((s, i) => s + i.stock * i.cost, 0),
    };
  }, [data]);

  const exportCsv = () => {
    const rows = [
      ["Insumo", "Categoría", "Stock", "Unidad", "Costo", "Estado"],
      ...filtered.map((i) => [i.name, i.category, i.stock, i.unit, i.cost, STOCK_STATUS[i.status].label]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "inventario-axis.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Inventario exportado", { description: `${filtered.length} insumos · CSV` });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Control de insumos y materias primas"
        icon={<Boxes className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button size="sm" onClick={() => toast.info("Formulario de nuevo insumo")}>
              <Plus className="h-4 w-4" /> Insumo
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={Package} label="Insumos totales" value={`${summary.total}`} tone="text-primary" />
        <SummaryCard icon={TrendingDown} label="Stock bajo" value={`${summary.low}`} tone="text-warning" />
        <SummaryCard icon={AlertTriangle} label="Stock crítico" value={`${summary.critical}`} tone="text-destructive" />
        <SummaryCard icon={Boxes} label="Valor en inventario" value={formatCurrency(summary.value)} tone="text-emerald-500" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Buscar insumo…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Bajo</SelectItem>
              <SelectItem value="critical">Crítico</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Insumo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Nivel de stock</TableHead>
                <TableHead className="text-right">Costo unit.</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((item) => (
                <InventoryRow key={item.id} item={item} />
              ))}
            </TableBody>
          </Table>
        )}
        {!loading && filtered.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">Sin resultados para los filtros aplicados.</p>
        )}
      </Card>
    </div>
  );
}

function InventoryRow({ item }: { item: InventoryItem }) {
  const pct = Math.min((item.stock / (item.minStock * 1.6)) * 100, 100);
  const barColor: Record<StockStatus, string> = {
    normal: "bg-emerald-500",
    low: "bg-warning",
    critical: "bg-destructive",
  };
  return (
    <TableRow>
      <TableCell>
        <p className="font-medium">{item.name}</p>
        <p className="text-xs text-muted-foreground">Actualizado {item.updatedAt}</p>
      </TableCell>
      <TableCell className="text-muted-foreground">{item.category}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Progress value={pct} className="h-1.5 w-24" indicatorClassName={barColor[item.status]} />
          <span className="whitespace-nowrap text-sm font-medium">
            {item.stock} {item.unit}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground">mín. {item.minStock} {item.unit}</p>
      </TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(item.cost)}</TableCell>
      <TableCell className="text-muted-foreground">{item.supplier}</TableCell>
      <TableCell>
        <Badge variant={STOCK_STATUS[item.status].variant}>{STOCK_STATUS[item.status].label}</Badge>
      </TableCell>
    </TableRow>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: string;
}) {
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
