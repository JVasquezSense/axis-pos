"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Search, CalendarDays, Loader2 } from "lucide-react";
import { useHistoryStore, type ArchivedSale } from "@/store/history.store";
import { USE_API } from "@/services/http";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { PAYMENT_LABEL } from "@/lib/payments";

type Range = "today" | "week" | "month" | "all";

const RANGES: { key: Range; label: string }[] = [
  { key: "today", label: "Hoy" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mes" },
  { key: "all", label: "Todo" },
];

function startOf(range: Range): number {
  const now = new Date();
  switch (range) {
    case "today": {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      return d.getTime();
    }
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - d.getDay());
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }
    case "month": {
      const d = new Date(now.getFullYear(), now.getMonth(), 1);
      return d.getTime();
    }
    default:
      return 0;
  }
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const sales = useHistoryStore((s) => s.sales);
  const loading = useHistoryStore((s) => s.loading);
  const load = useHistoryStore((s) => s.load);
  const [range, setRange] = useState<Range>("all");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [waiterFilter, setWaiterFilter] = useState<string>("all");

  // Carga las ventas reales del backend al montar.
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const from = startOf(range);
    const q = search.toLowerCase();
    return sales.filter((s) => {
      if (s.ts < from) return false;
      if (methodFilter !== "all" && s.method !== methodFilter) return false;
      if (waiterFilter !== "all" && s.waiter !== waiterFilter) return false;
      if (q) {
        const hay =
          s.id.toLowerCase().includes(q) ||
          s.waiter.toLowerCase().includes(q) ||
          s.saleType.toLowerCase().includes(q) ||
          String(s.table).includes(q);
        if (!hay) return false;
      }
      return true;
    });
  }, [sales, range, search, methodFilter, waiterFilter]);

  const stats = useMemo(() => {
    const total = filtered.reduce((s, r) => s + r.total, 0);
    const tips = filtered.reduce((s, r) => s + r.tip, 0);
    const avg = filtered.length > 0 ? Math.round(total / filtered.length) : 0;
    return { total, tips, avg, count: filtered.length };
  }, [filtered]);

  const methods = useMemo(() => Array.from(new Set(sales.map((s) => s.method))), [sales]);
  const waiters = useMemo(() => Array.from(new Set(sales.map((s) => s.waiter).filter(Boolean))), [sales]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de ventas"
        description="Consulta todas las ventas archivadas por turno"
        icon={<History className="h-5 w-5" />}
      />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                range === r.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar por mesero, mesa, tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <select
          value={methodFilter}
          onChange={(e) => setMethodFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs"
        >
          <option value="all">Todos los métodos</option>
          {methods.map((m) => (
            <option key={m} value={m}>{PAYMENT_LABEL[m] ?? m}</option>
          ))}
        </select>

        <select
          value={waiterFilter}
          onChange={(e) => setWaiterFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-background px-3 text-xs"
        >
          <option value="all">Todos los meseros</option>
          {waiters.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniKpi label="Ventas" value={formatCurrency(stats.total)} />
        <MiniKpi label="Transacciones" value={String(stats.count)} />
        <MiniKpi label="Ticket promedio" value={formatCurrency(stats.avg)} />
        <MiniKpi label="Propinas" value={formatCurrency(stats.tips)} />
      </div>

      {/* Lista */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {USE_API && loading ? (
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-muted-foreground/40" />
              ) : (
                <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
              )}
              <p className="font-medium">
                {USE_API && loading ? "Cargando ventas…" : "Sin ventas en este periodo"}
              </p>
              {!USE_API && <p className="mt-1 text-xs">Las ventas aparecen aquí al cerrar un turno.</p>}
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="px-4 py-2.5 font-medium">Código</th>
                    <th className="px-4 py-2.5 font-medium">Fecha</th>
                    <th className="px-4 py-2.5 font-medium">Tipo</th>
                    <th className="px-4 py-2.5 font-medium">Mesa</th>
                    <th className="px-4 py-2.5 font-medium">Mesero</th>
                    <th className="px-4 py-2.5 font-medium">Método</th>
                    <th className="px-4 py-2.5 font-medium">Propina</th>
                    <th className="px-4 py-2.5 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                        {s.invoiceNumber || s.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="text-xs">{fmtDate(s.ts)}</div>
                        <div className="text-[10px] text-muted-foreground">{fmtTime(s.ts)}</div>
                      </td>
                      <td className="px-4 py-2.5">{s.saleType}</td>
                      <td className="px-4 py-2.5">{s.table ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {s.waiter && s.waiter !== "Sin asignar" ? s.waiter : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge variant="outline" className="text-[10px]">
                          {PAYMENT_LABEL[s.method] ?? s.method}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5">
                        {s.tip > 0 ? (
                          <span className="text-xs text-emerald-600">{formatCurrency(s.tip)}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold">{formatCurrency(s.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniKpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </Card>
  );
}
