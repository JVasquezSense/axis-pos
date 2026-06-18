"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Minus, Plus, Trash2, ShoppingCart, Send, Hash, ChevronDown, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { TABLES } from "@/mock/tables";
import { useOrderStore, orderSelectors, TAX_RATE } from "@/store/order.store";
import { formatCurrency } from "@/lib/utils";

export function OrderPanel() {
  const router = useRouter();
  const { lines, tableNumber, increment, decrement, remove, clear, setTable } = useOrderStore();
  const subtotal = orderSelectors.subtotal(lines);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;
  const count = orderSelectors.count(lines);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Pedido actual</h2>
          {count > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {count}
            </span>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-muted">
              {tableNumber ? (
                <>
                  <Hash className="h-3.5 w-3.5 text-primary" /> Mesa {tableNumber}
                </>
              ) : (
                <>
                  <ShoppingBag className="h-3.5 w-3.5" /> Para llevar
                </>
              )}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
            <DropdownMenuLabel>Asignar a mesa</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setTable(null)}>
              <ShoppingBag className="h-4 w-4" /> Para llevar
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="grid grid-cols-4 gap-1 p-1">
              {TABLES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTable(t.number)}
                  className={`flex h-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent ${
                    tableNumber === t.number ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {t.number}
                </button>
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto p-3">
        {lines.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart />}
            title="Pedido vacío"
            description="Selecciona productos del menú para comenzar a armar la orden."
            className="mt-8 border-0"
          />
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {lines.map((l) => (
                <motion.div
                  key={l.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-border p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-xl">
                      {l.product.image}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">{l.product.name}</p>
                        <button onClick={() => remove(l.id)} className="text-muted-foreground transition-colors hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {l.modifiers.length > 0 && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {l.modifiers.map((m) => m.name).join(" · ")}
                        </p>
                      )}
                      {l.notes && <p className="mt-0.5 text-xs italic text-amber-600 dark:text-amber-400">“{l.notes}”</p>}
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1 rounded-lg border border-border">
                          <button onClick={() => decrement(l.id)} className="flex h-7 w-7 items-center justify-center rounded-l-lg hover:bg-muted">
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{l.quantity}</span>
                          <button onClick={() => increment(l.id)} className="flex h-7 w-7 items-center justify-center rounded-r-lg hover:bg-muted">
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <span className="text-sm font-semibold">{formatCurrency(orderSelectors.lineTotal(l))}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {lines.length > 0 && (
        <div className="border-t border-border p-4">
          <div className="space-y-1.5 text-sm">
            <Row label="Subtotal" value={formatCurrency(subtotal)} />
            <Row label={`Impuesto (${Math.round(TAX_RATE * 100)}%)`} value={formatCurrency(tax)} muted />
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold">{formatCurrency(total)}</span>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={() => {
                clear();
                toast.info("Pedido vaciado");
              }}
            >
              Vaciar
            </Button>
            <Button
              className="col-span-2"
              onClick={() => {
                toast.success("Pedido enviado a cocina", { description: `${count} productos · ${formatCurrency(total)}` });
                router.push("/kitchen");
              }}
            >
              <Send className="h-4 w-4" /> Enviar a cocina
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={muted ? "text-muted-foreground" : "font-medium"}>{value}</span>
    </div>
  );
}
