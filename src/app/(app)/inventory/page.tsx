"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Boxes,
  Download,
  Search,
  Plus,
  AlertTriangle,
  TrendingDown,
  Package,
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
} from "lucide-react";
import type { InventoryItem, StockStatus } from "@/types";
import { inventoryService } from "@/services/inventory.service";
import { useAsync } from "@/hooks/use-async";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddSupplyDialog } from "@/components/inventory/add-supply-dialog";
import { KardexView } from "@/components/inventory/kardex-view";
import { PhysicalCountView } from "@/components/inventory/physical-count-view";
import { ConsumptionView } from "@/components/inventory/consumption-view";
import { STOCK_STATUS } from "@/lib/status";
import { exportCsv } from "@/lib/export";
import { cn, formatCurrency } from "@/lib/utils";

type SortKey = "name" | "category" | "stock" | "cost" | "value" | "status";
const STATUS_RANK: Record<StockStatus, number> = { critical: 0, low: 1, normal: 2 };

export default function InventoryPage() {
  const { data, loading } = useAsync(() => inventoryService.getItems());
  const { data: movements } = useAsync(() => inventoryService.getMovements());
  const { data: counts } = useAsync(() => inventoryService.getPhysicalCounts());

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "status", dir: "asc" });
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    if (data) setItems(data);
  }, [data]);

  const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))), [items]);

  const filtered = useMemo(() => {
    const out = items.filter(
      (i) =>
        (status === "all" || i.status === status) &&
        (category === "all" || i.category === category) &&
        (query === "" || i.name.toLowerCase().includes(query.toLowerCase()))
    );
    out.sort((a, b) => {
      let av: string | number, bv: string | number;
      switch (sort.key) {
        case "name": av = a.name; bv = b.name; break;
        case "category": av = a.category; bv = b.category; break;
        case "stock": av = a.stock; bv = b.stock; break;
        case "cost": av = a.cost; bv = b.cost; break;
        case "value": av = a.stock * a.cost; bv = b.stock * b.cost; break;
        case "status": av = STATUS_RANK[a.status]; bv = STATUS_RANK[b.status]; break;
      }
      const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sort.dir === "asc" ? cmp : -cmp;
    });
    return out;
  }, [items, status, category, query, sort]);

  const summary = useMemo(() => ({
    total: items.length,
    critical: items.filter((i) => i.status === "critical").length,
    low: items.filter((i) => i.status === "low").length,
    value: items.reduce((s, i) => s + i.stock * i.cost, 0),
  }), [items]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));

  const exportStock = () => {
    exportCsv(
      "inventario-existencias-axis",
      ["Insumo", "Categoría", "Stock", "Unidad", "Stock mínimo", "Costo unit.", "Valor inventario", "Proveedor", "Estado", "Actualizado"],
      filtered.map((i) => [i.name, i.category, i.stock, i.unit, i.minStock, i.cost, Math.round(i.stock * i.cost), i.supplier, STOCK_STATUS[i.status].label, i.updatedAt])
    );
    toast.success("Existencias exportadas", { description: `${filtered.length} insumos · CSV (Excel)` });
  };

  const addItem = (item: InventoryItem) => {
    setItems((prev) => [item, ...prev]);
    toast.success("Insumo agregado", { description: item.name });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventario"
        description="Control de insumos, kardex y conteos físicos"
        icon={<Boxes className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Insumo
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard icon={Package} label="Insumos totales" value={`${summary.total}`} tone="text-primary" />
        <SummaryCard icon={TrendingDown} label="Stock bajo" value={`${summary.low}`} tone="text-warning" />
        <SummaryCard icon={AlertTriangle} label="Stock crítico" value={`${summary.critical}`} tone="text-destructive" />
        <SummaryCard icon={Boxes} label="Valor en inventario" value={formatCurrency(summary.value)} tone="text-emerald-500" />
      </div>

      <Tabs defaultValue="stock">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="stock">Existencias</TabsTrigger>
          <TabsTrigger value="kardex">Kardex</TabsTrigger>
          <TabsTrigger value="physical">Conteo físico</TabsTrigger>
          <TabsTrigger value="consumption">Salida por plato</TabsTrigger>
        </TabsList>

        {/* EXISTENCIAS */}
        <TabsContent value="stock">
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
                <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Categoría" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Estado" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Bajo</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={exportStock}>
                <Download className="h-4 w-4" /> Exportar
              </Button>
            </div>

            {loading && items.length === 0 ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHead label="Insumo" k="name" sort={sort} onSort={toggleSort} />
                    <SortHead label="Categoría" k="category" sort={sort} onSort={toggleSort} />
                    <SortHead label="Nivel de stock" k="stock" sort={sort} onSort={toggleSort} />
                    <SortHead label="Costo unit." k="cost" sort={sort} onSort={toggleSort} align="right" />
                    <SortHead label="Valor" k="value" sort={sort} onSort={toggleSort} align="right" />
                    <SortHead label="Estado" k="status" sort={sort} onSort={toggleSort} />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((item) => <InventoryRow key={item.id} item={item} />)}
                </TableBody>
              </Table>
            )}
            {!loading && filtered.length === 0 && (
              <p className="py-12 text-center text-sm text-muted-foreground">Sin resultados para los filtros aplicados.</p>
            )}
          </Card>
        </TabsContent>

        {/* KARDEX */}
        <TabsContent value="kardex">
          {items.length && movements ? (
            <KardexView items={items} movements={movements} />
          ) : (
            <Skeleton className="h-80 w-full rounded-xl" />
          )}
        </TabsContent>

        {/* CONTEO FÍSICO */}
        <TabsContent value="physical">
          {items.length && counts ? (
            <PhysicalCountView items={items} counts={counts} />
          ) : (
            <Skeleton className="h-80 w-full rounded-xl" />
          )}
        </TabsContent>

        {/* SALIDA POR PLATO */}
        <TabsContent value="consumption">
          <ConsumptionView />
        </TabsContent>
      </Tabs>

      <AddSupplyDialog open={addOpen} onOpenChange={setAddOpen} onCreate={addItem} />
    </div>
  );
}

function SortHead({
  label,
  k,
  sort,
  onSort,
  align,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: "asc" | "desc" };
  onSort: (k: SortKey) => void;
  align?: "right";
}) {
  const active = sort.key === k;
  return (
    <TableHead className={align === "right" ? "text-right" : ""}>
      <button
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
          <span className="whitespace-nowrap text-sm font-medium">{item.stock} {item.unit}</span>
        </div>
        <p className="text-[11px] text-muted-foreground">mín. {item.minStock} {item.unit}</p>
      </TableCell>
      <TableCell className="text-right font-medium">{formatCurrency(item.cost)}</TableCell>
      <TableCell className="text-right">{formatCurrency(item.stock * item.cost)}</TableCell>
      <TableCell>
        <Badge variant={STOCK_STATUS[item.status].variant}>{STOCK_STATUS[item.status].label}</Badge>
      </TableCell>
    </TableRow>
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
