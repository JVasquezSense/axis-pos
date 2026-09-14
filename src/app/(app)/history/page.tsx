"use client";

import { useEffect, useMemo, useState } from "react";
import { History, Search, CalendarDays, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/store/app.store";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ApiError } from "@/services/http";
import { useHistoryStore, type ArchivedSale } from "@/store/history.store";
import { USE_API } from "@/services/http";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { PAYMENT_LABEL } from "@/lib/payments";
import { DateRangeFilter, ALL_TIME, tsInRange, type DateRange } from "@/components/shared/date-range-filter";

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
  const isAdmin = useAppStore((st) => st.role) === "admin";
  const removeSale = useHistoryStore((st) => st.removeSale);
  const [toVoid, setToVoid] = useState<ArchivedSale | null>(null);
  const [detail, setDetail] = useState<ArchivedSale | null>(null);
  const [voiding, setVoiding] = useState(false);

  const confirmVoid = async () => {
    if (!toVoid) return;
    setVoiding(true);
    try {
      await removeSale(String(toVoid.id));
      toast.success(`Venta ${toVoid.invoiceNumber || ""} anulada`, { description: "El inventario volvió al kardex." });
      setToVoid(null);
    } catch (err) {
      toast.error("No se pudo anular", { description: err instanceof ApiError ? err.message.slice(0, 140) : undefined });
    } finally {
      setVoiding(false);
    }
  };

  const sales = useHistoryStore((s) => s.sales);
  const loading = useHistoryStore((s) => s.loading);
  const load = useHistoryStore((s) => s.load);
  // Rango libre (desde/hasta) con atajos; antes solo Hoy/Semana/Mes/Todo.
  const [range, setRange] = useState<DateRange>(ALL_TIME);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [waiterFilter, setWaiterFilter] = useState<string>("all");

  // Carga las ventas reales del backend al montar.
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sales.filter((s) => {
      if (!tsInRange(s.ts, range)) return false;
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
        <DateRangeFilter value={range} onChange={setRange} />

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
                    {isAdmin && <th className="px-2 py-2.5" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => setDetail(s)}
                      className="cursor-pointer transition-colors hover:bg-muted/40"
                    >
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
                      {isAdmin && (
                        <td className="px-2 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setToVoid(s); }}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            title="Anular venta"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalle: qué se vendió, quién atendió y cómo se pagó. */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="flex max-h-[88vh] max-w-lg flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Venta {detail?.invoiceNumber || detail?.id.slice(-6).toUpperCase()}
              {detail && <Badge variant="outline" className="text-[10px]">{PAYMENT_LABEL[detail.method] ?? detail.method}</Badge>}
            </DialogTitle>
            <DialogDescription>
              {detail && `${fmtDate(detail.ts)} · ${fmtTime(detail.ts)}`}
            </DialogDescription>
          </DialogHeader>
          {detail && (
            <div className="-mr-2 flex-1 space-y-4 overflow-y-auto pr-2">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
                <Info label="Tipo" value={detail.saleType} />
                <Info label="Mesa" value={detail.table ? `Mesa ${detail.table}` : "—"} />
                <Info label="Atendió" value={detail.waiter && detail.waiter !== "Sin asignar" ? detail.waiter : "—"} />
                {detail.customer && <Info label="Cliente" value={detail.customer} />}
                {detail.orderCodes && detail.orderCodes.length > 0 && <Info label="Pedido" value={detail.orderCodes.join(", ")} />}
                {detail.observations && <Info label="Nota" value={detail.observations} className="col-span-2 sm:col-span-3" />}
              </dl>

              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Productos</p>
                {detail.lines && detail.lines.length > 0 ? (
                  <ul className="divide-y divide-border rounded-xl border border-border">
                    {detail.lines.map((l, i) => (
                      <li key={i} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0">
                          <span className="font-medium">{l.quantity}× {l.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatCurrency(l.unitPrice)} c/u{l.notes ? ` · ${l.notes}` : ""}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">{formatCurrency(l.total)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    Esta venta se registró antes de que el historial guardara el detalle: solo se conoce el total ({detail.items} ítem{detail.items === 1 ? "" : "s"}).
                  </p>
                )}
              </div>

              <div className="space-y-1 rounded-xl bg-muted/40 p-3 text-sm">
                {detail.subtotal != null && <Line label="Subtotal" value={formatCurrency(detail.subtotal)} />}
                {(detail.discount ?? 0) > 0 && <Line label="Descuento" value={`- ${formatCurrency(detail.discount!)}`} />}
                {detail.taxes && detail.taxes.length > 0
                  ? detail.taxes.map((t) => <Line key={t.name} label={t.name} value={formatCurrency(t.amount)} muted />)
                  : (detail.tax ?? 0) > 0 && <Line label="Impuestos" value={formatCurrency(detail.tax!)} muted />}
                {detail.tip > 0 && <Line label="Propina" value={formatCurrency(detail.tip)} muted />}
                <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold">
                  <span>Total</span><span className="tabular-nums">{formatCurrency(detail.total)}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            {isAdmin && detail && (
              <Button variant="outline" className="text-destructive" onClick={() => { setToVoid(detail); setDetail(null); }}>
                <Trash2 className="h-4 w-4" /> Anular
              </Button>
            )}
            <Button onClick={() => setDetail(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anular es irreversible y mueve inventario: se confirma con el detalle
          a la vista. */}
      <Dialog open={!!toVoid} onOpenChange={(v) => !v && setToVoid(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Anular venta {toVoid?.invoiceNumber || ""}</DialogTitle>
            <DialogDescription>
              Se elimina del historial y del cierre de turno, y el inventario que descontó vuelve al kardex
              como entrada. No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          {toVoid && (
            <div className="rounded-xl border border-border p-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatCurrency(toVoid.total)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Método</span><span>{PAYMENT_LABEL[toVoid.method] ?? toVoid.method}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tipo</span><span>{toVoid.saleType}{toVoid.table ? ` · Mesa ${toVoid.table}` : ""}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Fecha</span><span>{fmtDate(toVoid.ts)} {fmtTime(toVoid.ts)}</span></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setToVoid(null)} disabled={voiding}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmVoid} disabled={voiding}>
              {voiding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Anular venta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Info({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Line({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between", muted && "text-muted-foreground")}>
      <span>{label}</span><span className="tabular-nums">{value}</span>
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
