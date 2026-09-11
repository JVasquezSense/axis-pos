"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Check, Users, UtensilsCrossed, Receipt, Loader2 } from "lucide-react";
import type { OrderLine, PaymentMethod } from "@/types";
import { ProductImage } from "@/components/shared/product-image";
import { Icon } from "@/components/shared/icon";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PAYMENT_METHODS, PAYMENT_LABEL } from "@/lib/payments";
import { lineUnitPrice } from "@/lib/taxes";
import { distribute } from "@/lib/split";
import { cn, formatCurrency } from "@/lib/utils";

const PERSON_COLORS = [
  "bg-violet-500", "bg-emerald-500", "bg-sky-500", "bg-amber-500",
  "bg-rose-500", "bg-fuchsia-500", "bg-cyan-500", "bg-orange-500",
];

/** Lo que paga un comensal, con el desglose que va a su factura. */
export interface PersonShare {
  index: number;
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
  /** Unidades que consumió, para la factura: "2× Cerveza, 1× Mojito". */
  items: number;
}

export interface SplitBreakdown {
  subtotal: number;
  tax: number;
  tip: number;
  discount: number;
  total: number;
}

interface Payment {
  method: PaymentMethod;
  invoiceNumber?: string;
  amount: number;
}

/**
 * División de la cuenta.
 *
 * Dos modos: en partes iguales, o cada quien paga lo suyo. En el segundo, cada
 * unidad de cada producto se asigna a una persona —dos cervezas pueden ir una a
 * cada uno— y lo que nadie reclama se reparte entre todos.
 *
 * Cada comensal se cobra por separado, con su medio de pago y su factura.
 * Antes el diálogo solo marcaba "pagado" en pantalla y al terminar no se
 * registraba ninguna venta: la mesa se liberaba y el dinero no quedaba en
 * ningún sitio.
 */
export function SplitBillDialog({
  open,
  onOpenChange,
  lines,
  breakdown,
  onPayPerson,
  onComplete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lines: OrderLine[];
  breakdown: SplitBreakdown;
  /** Registra la venta de un comensal y devuelve su número de factura. */
  onPayPerson: (share: PersonShare, method: PaymentMethod) => Promise<string | undefined | null>;
  /** Todos cobrados: cerrar la mesa. */
  onComplete: () => void;
}) {
  const [people, setPeople] = useState(2);
  const [mode, setMode] = useState<"equal" | "items">("equal");
  // Unidades de cada línea asignadas a cada persona: units[lineId][persona].
  const [units, setUnits] = useState<Record<string, number[]>>({});
  const [payments, setPayments] = useState<Record<number, Payment>>({});
  const [method, setMethod] = useState<Record<number, PaymentMethod>>({});
  const [paying, setPaying] = useState<number | null>(null);
  // Persona a la que se le van dando las unidades al tocar los productos.
  const [active, setActive] = useState(0);

  // Estado limpio cuando cambia la cuenta, no al reabrir: cerrar con "Seguir
  // luego" y volver tiene que encontrar los cobros ya hechos, pero una mesa
  // nueva no puede heredar los de la anterior (se cobraba dos veces a la misma
  // persona).
  const signature = lines.map((l) => `${l.id}:${l.quantity}`).join("|");
  useEffect(() => {
    setPeople(2);
    setMode("equal");
    setUnits({});
    setPayments({});
    setMethod({});
    setPaying(null);
    setActive(0);
  }, [signature]);

  const anyPaid = Object.keys(payments).length > 0;

  const setCount = (n: number) => {
    if (anyPaid) return; // con cobros hechos ya no se puede cambiar el reparto
    const next = Math.min(Math.max(n, 2), 8);
    setPeople(next);
    setActive((a) => Math.min(a, next - 1));
    setUnits((prev) => {
      const out: Record<string, number[]> = {};
      for (const k in prev) out[k] = Array.from({ length: next }, (_, i) => prev[k][i] ?? 0);
      return out;
    });
  };

  const countsFor = (line: OrderLine) =>
    units[line.id] ?? Array.from({ length: people }, () => 0);
  const assignedOf = (line: OrderLine) => countsFor(line).reduce((s, n) => s + n, 0);

  const bump = (line: OrderLine, person: number, delta: number) => {
    if (anyPaid) return;
    setUnits((prev) => {
      const cur = prev[line.id] ?? Array.from({ length: people }, () => 0);
      const assigned = cur.reduce((s, n) => s + n, 0);
      const next = [...cur];
      const value = next[person] + delta;
      if (value < 0) return prev;
      if (delta > 0 && assigned >= line.quantity) return prev;
      next[person] = value;
      return { ...prev, [line.id]: next };
    });
  };

  /** Dueño de cada unidad de la línea (null = libre), en orden de persona. */
  const owners = (line: OrderLine): (number | null)[] => {
    const out: (number | null)[] = [];
    countsFor(line).forEach((n, i) => { for (let k = 0; k < n; k++) out.push(i); });
    while (out.length < line.quantity) out.push(null);
    return out;
  };

  /**
   * Un toque en el producto le da una unidad a la persona activa. Si ya no
   * quedan libres, se le quita una a quien más tenga y pasa a la activa: así
   * corregir un error es tocar otra vez, no buscar un botón de menos.
   */
  const giveToActive = (line: OrderLine) => {
    if (anyPaid) return;
    const counts = countsFor(line);
    const free = line.quantity - counts.reduce((s, n) => s + n, 0);
    if (free > 0) { bump(line, active, +1); return; }
    // Todo asignado: si la activa ya lo tiene entero, un toque más lo libera.
    if (counts[active] === line.quantity) {
      setUnits((prev) => ({ ...prev, [line.id]: counts.map(() => 0) }));
      return;
    }
    let from = -1;
    counts.forEach((n, i) => { if (i !== active && n > 0 && (from < 0 || n > counts[from])) from = i; });
    if (from < 0) return;
    setUnits((prev) => {
      const next = [...(prev[line.id] ?? counts)];
      next[from] -= 1;
      next[active] += 1;
      return { ...prev, [line.id]: next };
    });
  };

  /** Peso de cada persona = lo que consumió (lo libre se reparte entre todos). */
  const weights = useMemo(() => {
    if (mode === "equal") return Array.from({ length: people }, () => 1);
    const w = Array.from({ length: people }, () => 0);
    for (const line of lines) {
      const unit = lineUnitPrice(line);
      const counts = countsFor(line);
      const free = line.quantity - counts.reduce((s, n) => s + n, 0);
      counts.forEach((n, i) => { w[i] += n * unit; });
      if (free > 0) for (let i = 0; i < people; i++) w[i] += (free * unit) / people;
    }
    // Nadie consumió nada aún: mientras se asigna, se muestra en partes iguales.
    return w.some((x) => x > 0) ? w : Array.from({ length: people }, () => 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, people, lines, units]);

  /** Cada componente se reparte con los mismos pesos y suma exactamente el total. */
  const shares: PersonShare[] = useMemo(() => {
    const sub = distribute(breakdown.subtotal, weights);
    const tax = distribute(breakdown.tax, weights);
    const tip = distribute(breakdown.tip, weights);
    const disc = distribute(breakdown.discount, weights);
    const itemsPer = Array.from({ length: people }, () => 0);
    if (mode === "items") {
      for (const line of lines) countsFor(line).forEach((n, i) => { itemsPer[i] += n; });
    }
    return weights.map((_, i) => ({
      index: i,
      subtotal: sub[i],
      tax: tax[i],
      tip: tip[i],
      discount: disc[i],
      total: sub[i] + tax[i] + tip[i] - disc[i],
      items: itemsPer[i],
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weights, breakdown, people, mode, lines, units]);

  const unassigned = mode === "items"
    ? lines.reduce((s, l) => s + (l.quantity - assignedOf(l)), 0)
    : 0;

  const pending = shares.filter((s) => s.total > 0 && !payments[s.index]);
  const collected = Object.values(payments).reduce((s, p) => s + p.amount, 0);
  const allPaid = pending.length === 0 && shares.some((s) => s.total > 0);

  const pay = async (share: PersonShare) => {
    const m = method[share.index] ?? "cash";
    setPaying(share.index);
    try {
      const invoice = await onPayPerson(share, m);
      setPayments((p) => ({ ...p, [share.index]: { method: m, invoiceNumber: invoice ?? undefined, amount: share.total } }));
      toast.success(`Persona ${share.index + 1} cobrada`, {
        description: `${formatCurrency(share.total)} · ${PAYMENT_LABEL[m]}${invoice ? ` · ${invoice}` : ""}`,
      });
    } catch {
      toast.error("No se pudo registrar el cobro");
    } finally {
      setPaying(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-2xl flex-col gap-0 p-0">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Dividir cuenta</DialogTitle>
          <DialogDescription>Reparte {formatCurrency(breakdown.total)} entre los comensales y cobra a cada uno por separado.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="flex items-center gap-2 text-sm font-medium"><Users className="h-4 w-4" /> Personas</span>
          <div className={cn("flex items-center gap-1 rounded-lg border border-border", anyPaid && "opacity-50")}>
            <button onClick={() => setCount(people - 1)} disabled={anyPaid} className="flex h-8 w-8 items-center justify-center rounded-l-lg hover:bg-muted disabled:cursor-not-allowed">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold">{people}</span>
            <button onClick={() => setCount(people + 1)} disabled={anyPaid} className="flex h-8 w-8 items-center justify-center rounded-r-lg hover:bg-muted disabled:cursor-not-allowed">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="-mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
          <Tabs value={mode} onValueChange={(v) => { if (!anyPaid) setMode(v as "equal" | "items"); }} className="p-5">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="equal" disabled={anyPaid}><Users className="h-4 w-4" /> Partes iguales</TabsTrigger>
              <TabsTrigger value="items" disabled={anyPaid}><UtensilsCrossed className="h-4 w-4" /> Cada quien lo suyo</TabsTrigger>
            </TabsList>

            <TabsContent value="items">
              {/* Primero la persona, luego lo que consumió. Los numeritos por
                  producto obligaban a pensar en dos dimensiones a la vez. */}
              <div className="mb-3 flex flex-wrap gap-2">
                {shares.map((share) => {
                  const isActive = share.index === active;
                  return (
                    <button
                      key={share.index}
                      onClick={() => setActive(share.index)}
                      className={cn(
                        "flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 transition-all",
                        isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted"
                      )}
                    >
                      <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white", PERSON_COLORS[share.index % PERSON_COLORS.length])}>
                        {share.index + 1}
                      </span>
                      <span className="text-left leading-tight">
                        <span className={cn("block text-[11px]", isActive ? "font-semibold text-primary" : "text-muted-foreground")}>
                          Persona {share.index + 1}
                        </span>
                        <span className="block text-xs font-semibold">{formatCurrency(share.total)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                Con <span className="font-semibold text-foreground">Persona {active + 1}</span> elegida, toca cada producto que consumió. Lo que nadie reclame se reparte entre todos.
              </p>

              <div className="space-y-1.5">
                {lines.map((line) => {
                  const who = owners(line);
                  const mine = countsFor(line)[active] ?? 0;
                  return (
                    <button
                      key={line.id}
                      onClick={() => giveToActive(line)}
                      disabled={anyPaid}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-colors disabled:cursor-not-allowed",
                        mine > 0 ? "border-primary/50 bg-primary/[0.03]" : "border-border hover:bg-muted"
                      )}
                    >
                      <ProductImage emoji={line.product.image} category={line.product.category} size="sm" className="h-9 w-9 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{line.quantity}× {line.product.name}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {who.every((o) => o === null)
                            ? "Compartido por todos"
                            : who.some((o) => o === null)
                              ? `${who.filter((o) => o === null).length} sin asignar · se reparte`
                              : "Asignado"}
                        </span>
                      </span>
                      {/* Un punto por unidad, del color de quien la tiene. */}
                      <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                        {who.map((o, k) => (
                          <span
                            key={k}
                            className={cn(
                              "flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                              o === null ? "border border-dashed border-border text-muted-foreground" : cn(PERSON_COLORS[o % PERSON_COLORS.length], "text-white")
                            )}
                          >
                            {o === null ? "" : o + 1}
                          </span>
                        ))}
                      </span>
                      <span className="w-20 shrink-0 text-right text-sm font-semibold">{formatCurrency(lineUnitPrice(line) * line.quantity)}</span>
                    </button>
                  );
                })}
              </div>
              {unassigned > 0 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {unassigned} unidad(es) sin asignar se reparten en partes iguales.
                </p>
              )}
            </TabsContent>

            {/* Tarjetas de cobro: iguales en los dos modos */}
            <div className={cn("grid grid-cols-1 gap-2 sm:grid-cols-2", mode === "items" && "mt-3 border-t border-border pt-3")}>
              {shares.map((share) => {
                const paid = payments[share.index];
                const m = method[share.index] ?? "cash";
                return (
                  <div
                    key={share.index}
                    className={cn(
                      "rounded-xl border p-3 transition-colors",
                      paid ? "border-success bg-success/5" : share.total === 0 ? "border-dashed border-border opacity-60" : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", PERSON_COLORS[share.index % PERSON_COLORS.length])}>
                        {paid ? <Check className="h-4 w-4" /> : share.index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] text-muted-foreground">
                          Persona {share.index + 1}
                          {mode === "items" && share.items > 0 && ` · ${share.items} ítem${share.items > 1 ? "s" : ""}`}
                        </p>
                        <p className="truncate text-base font-bold">{formatCurrency(share.total)}</p>
                      </div>
                    </div>

                    {paid ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Cobrado · {PAYMENT_LABEL[paid.method]}{paid.invoiceNumber ? ` · ${paid.invoiceNumber}` : ""}
                      </p>
                    ) : share.total === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">Sin consumo</p>
                    ) : (
                      <div className="mt-2 flex items-center gap-1.5">
                        <div className="flex flex-1 gap-1">
                          {PAYMENT_METHODS.map((pm) => (
                            <button
                              key={pm.id}
                              onClick={() => setMethod((x) => ({ ...x, [share.index]: pm.id }))}
                              title={pm.label}
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-lg border transition-colors",
                                m === pm.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"
                              )}
                            >
                              <Icon name={pm.icon} className="h-4 w-4" />
                            </button>
                          ))}
                        </div>
                        <Button size="sm" onClick={() => pay(share)} disabled={paying !== null}>
                          {paying === share.index ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Cobrar"}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Tabs>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border p-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Cobrado </span>
            <span className="font-semibold">{Object.keys(payments).length}/{shares.filter((s) => s.total > 0).length}</span>
            <span className="text-muted-foreground"> · </span>
            <span className="font-semibold">{formatCurrency(collected)}</span>
            {collected < breakdown.total && collected > 0 && (
              <span className="text-muted-foreground"> · faltan {formatCurrency(breakdown.total - collected)}</span>
            )}
          </div>
          {allPaid ? (
            <Button
              onClick={() => {
                onOpenChange(false);
                onComplete();
              }}
            >
              <Check className="h-4 w-4" /> Finalizar y liberar mesa
            </Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {anyPaid ? "Seguir luego" : "Cerrar"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
