"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Minus, Plus, Check, Users, UtensilsCrossed, Receipt } from "lucide-react";
import type { OrderLine } from "@/types";
import { ProductImage } from "@/components/shared/product-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { orderSelectors } from "@/store/order.store";
import { distribute } from "@/lib/split";
import { cn, formatCurrency } from "@/lib/utils";

const PERSON_COLORS = [
  "bg-violet-500", "bg-emerald-500", "bg-sky-500", "bg-amber-500",
  "bg-rose-500", "bg-fuchsia-500", "bg-cyan-500", "bg-orange-500",
];

export function SplitBillDialog({
  open,
  onOpenChange,
  lines,
  subtotal,
  total,
  onComplete,
  onPartialPay,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lines: OrderLine[];
  subtotal: number;
  total: number;
  onComplete?: () => void;
  onPartialPay?: (collected: number) => void;
}) {
  const [people, setPeople] = useState(2);
  const [mode, setMode] = useState<"people" | "items">("people");
  // Asignación de cada línea a comensales (índices). Vacío = compartido por todos.
  const [assign, setAssign] = useState<Record<string, number[]>>({});
  const [paid, setPaid] = useState<number[]>([]);

  const setCount = (n: number) => {
    const next = Math.min(Math.max(n, 2), 8);
    setPeople(next);
    setAssign((prev) => {
      const out: Record<string, number[]> = {};
      for (const k in prev) out[k] = prev[k].filter((i) => i < next);
      return out;
    });
    setPaid((p) => p.filter((i) => i < next));
  };

  const toggleAssign = (lineId: string, person: number) =>
    setAssign((prev) => {
      const cur = prev[lineId] ?? [];
      return { ...prev, [lineId]: cur.includes(person) ? cur.filter((p) => p !== person) : [...cur, person] };
    });

  // Pesos por comensal según ítems consumidos (los sin asignar se reparten entre todos)
  const shares = useMemo(() => {
    const s = Array(people).fill(0);
    lines.forEach((line) => {
      const lt = orderSelectors.lineTotal(line);
      const a = assign[line.id] ?? [];
      if (a.length === 0) {
        for (let i = 0; i < people; i++) s[i] += lt / people;
      } else {
        a.forEach((i) => (s[i] += lt / a.length));
      }
    });
    return s;
  }, [lines, assign, people]);

  const amounts = useMemo(
    () => (mode === "people" ? distribute(total, Array(people).fill(1)) : distribute(total, shares)),
    [mode, total, people, shares]
  );

  const togglePaid = (i: number) =>
    setPaid((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  const unassignedCount = mode === "items"
    ? lines.filter((l) => !(assign[l.id]?.length)).length
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle className="flex items-center gap-2"><Receipt className="h-5 w-5" /> Dividir cuenta</DialogTitle>
          <DialogDescription>Reparte {formatCurrency(total)} entre los comensales.</DialogDescription>
        </DialogHeader>

        {/* Selector de personas */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="flex items-center gap-2 text-sm font-medium"><Users className="h-4 w-4" /> Personas</span>
          <div className="flex items-center gap-1 rounded-lg border border-border">
            <button onClick={() => setCount(people - 1)} className="flex h-8 w-8 items-center justify-center rounded-l-lg hover:bg-muted">
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-8 text-center text-sm font-bold">{people}</span>
            <button onClick={() => setCount(people + 1)} className="flex h-8 w-8 items-center justify-center rounded-r-lg hover:bg-muted">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "people" | "items")} className="p-5">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="people"><Users className="h-4 w-4" /> Por personas</TabsTrigger>
            <TabsTrigger value="items"><UtensilsCrossed className="h-4 w-4" /> Por producto</TabsTrigger>
          </TabsList>

          {/* POR PERSONAS */}
          <TabsContent value="people">
            <div className="grid grid-cols-2 gap-2">
              {amounts.map((amt, i) => (
                <PersonCard key={i} index={i} amount={amt} paid={paid.includes(i)} onToggle={() => togglePaid(i)} />
              ))}
            </div>
          </TabsContent>

          {/* POR PRODUCTO */}
          <TabsContent value="items">
            <div className="scrollbar-thin max-h-52 space-y-2 overflow-y-auto pr-1">
              {lines.map((line) => {
                const a = assign[line.id] ?? [];
                return (
                  <div key={line.id} className="rounded-xl border border-border p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm">
                        <ProductImage emoji={line.product.image} category={line.product.category} size="sm" className="h-8 w-8 shrink-0" />
                        <span className="font-medium">{line.quantity}× {line.product.name}</span>
                      </span>
                      <span className="text-sm font-semibold">{formatCurrency(orderSelectors.lineTotal(line))}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      {Array.from({ length: people }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => toggleAssign(line.id, i)}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-white transition-all",
                            a.includes(i) ? PERSON_COLORS[i % PERSON_COLORS.length] : "bg-muted text-muted-foreground"
                          )}
                          title={`Persona ${i + 1}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      {a.length === 0 && <span className="ml-1 text-[11px] text-muted-foreground">Compartido por todos</span>}
                      {a.length > 1 && <span className="ml-1 text-[11px] text-muted-foreground">÷ {a.length}</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {unassignedCount > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {unassignedCount} ítem(s) sin asignar se reparten en partes iguales.
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
              {amounts.map((amt, i) => (
                <PersonCard key={i} index={i} amount={amt} paid={paid.includes(i)} onToggle={() => togglePaid(i)} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between border-t border-border p-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Cobrado </span>
            <span className="font-semibold">{paid.length}/{people}</span>
            <span className="text-muted-foreground"> · </span>
            <span className="font-semibold">{formatCurrency(paid.reduce((s, i) => s + amounts[i], 0))}</span>
          </div>
          {paid.length === people ? (
            <Button
              onClick={() => {
                onOpenChange(false);
                onComplete?.();
                toast.success("Cuenta dividida y cobrada", { description: `${people} pagos · ${formatCurrency(total)}` });
              }}
            >
              <Check className="h-4 w-4" /> Finalizar
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => {
                const collected = paid.reduce((s, i) => s + amounts[i], 0);
                if (collected > 0) onPartialPay?.(collected);
                onOpenChange(false);
              }}
            >
              {paid.length > 0 ? `Cerrar · ${paid.length} cobrado${paid.length > 1 ? "s" : ""}` : "Cerrar"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PersonCard({ index, amount, paid, onToggle }: { index: number; amount: number; paid: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all",
        paid ? "border-success bg-success/5" : "border-border hover:bg-muted"
      )}
    >
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white", PERSON_COLORS[index % PERSON_COLORS.length])}>
        {paid ? <Check className="h-4 w-4" /> : index + 1}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">Persona {index + 1}</p>
        <p className="truncate text-sm font-bold">{formatCurrency(amount)}</p>
      </div>
    </button>
  );
}
