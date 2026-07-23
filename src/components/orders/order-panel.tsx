"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Minus, Plus, Trash2, ShoppingCart, Send, Hash, ChevronDown, ShoppingBag, Loader2, CreditCard, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";
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
import { useOrderStore, orderSelectors, TAX_RATE } from "@/store/order.store";
import { useTablesStore } from "@/store/tables.store";
import { useAuditStore } from "@/store/audit.store";
import { formatCurrency } from "@/lib/utils";

export function OrderPanel() {
  const router = useRouter();
  const { lines, tableNumber, increment, decrement, remove, clear, setTable, sendToKitchen, setNotes, activeOrderIds, saveOrderChanges } = useOrderStore();
  const allTables = useTablesStore((s) => s.tables);
  const occupyTable = useTablesStore((s) => s.occupy);
  const subtotal = orderSelectors.subtotal(lines);
  const tax = Math.round(subtotal * TAX_RATE);
  const total = subtotal + tax;
  const count = orderSelectors.count(lines);
  const auditLog = useAuditStore((s) => s.log);
  const [sending, setSending] = useState(false);
  // Backlog #4: modo edición cuando hay órdenes ya enviadas para esta mesa.
  const editing = activeOrderIds.length > 0;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Pedido actual</h2>
          {editing && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              Editando
            </span>
          )}
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
              {allTables.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTable(t.number)}
                  title={t.status === "occupied" ? `Mesa ${t.number} - Ocupada` : `Mesa ${t.number} - ${t.zone}`}
                  className={`relative flex h-9 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent ${
                    tableNumber === t.number ? "bg-primary text-primary-foreground" : t.status === "occupied" ? "bg-amber-500/20 text-amber-700 dark:text-amber-400" : "bg-muted"
                  }`}
                >
                  {t.number}
                  {t.status === "occupied" && tableNumber !== t.number && (
                    <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
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
            title="Pedido vacio"
            description="Selecciona productos del menu para comenzar a armar la orden."
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
                    <ProductImage emoji={l.product.image} category={l.product.category} size="sm" className="h-10 w-10 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">{l.product.name}</p>
                        <button onClick={() => remove(l.id)} className="text-muted-foreground transition-colors hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {l.modifiers.length > 0 && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {l.modifiers.map((m) => m.name).join(" - ")}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1.5">
                        <MessageSquare className="h-3 w-3 shrink-0 text-amber-500" />
                        <input
                          placeholder="Sin pepinillos, extra queso..."
                          value={l.notes ?? ""}
                          onChange={(e) => setNotes(l.id, e.target.value)}
                          className="h-6 w-full rounded border-0 bg-transparent px-0 text-xs italic text-amber-600 placeholder:text-muted-foreground/50 outline-none dark:text-amber-400"
                        />
                      </div>
                      <div className="mt-1.5 flex items-center justify-between">
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
        <div className="relative z-[60] border-t border-border bg-background p-4">
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
            {tableNumber ? (
              editing ? (
                <Button
                  className="col-span-2"
                  disabled={sending}
                  onClick={async () => {
                    setSending(true);
                    try {
                      await saveOrderChanges();
                      auditLog({ action: "Pedido editado", details: `${count} productos - ${formatCurrency(total)} - Mesa ${tableNumber}`, user: "Sistema", module: "ventas" });
                      toast.success("Cambios guardados", { description: `Mesa ${tableNumber} actualizada` });
                      router.push("/kitchen");
                    } catch (err) {
                      const msg = err instanceof Error ? err.message : "Error desconocido";
                      toast.error("No se pudieron guardar los cambios", { description: msg.slice(0, 120) });
                    } finally {
                      setSending(false);
                    }
                  }}
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Guardar cambios
                </Button>
              ) : (
              <Button
                className="col-span-2"
                disabled={sending}
                onClick={async () => {
                  setSending(true);
                  try {
                    const ticket = await sendToKitchen("dine_in");
                    occupyTable(tableNumber, total);
                    auditLog({ action: "Pedido enviado a cocina", details: `${ticket.code} - ${count} productos - ${formatCurrency(total)} - Mesa ${tableNumber}`, user: "Sistema", module: "ventas" });
                    toast.success(`Pedido ${ticket.code} enviado a cocina`, { description: `${count} productos - ${formatCurrency(total)}` });
                    router.push("/kitchen");
                  } catch (err) {
                    const msg = err instanceof Error ? err.message : "Error desconocido";
                    console.error("[sendToKitchen] error:", err);
                    toast.error("No se pudo enviar el pedido a cocina", { description: msg.slice(0, 120) });
                  } finally {
                    setSending(false);
                  }
                }}
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Enviar a cocina
              </Button>
              )
            ) : (
              <Button
                className="col-span-2"
                onClick={() => router.push("/checkout")}
              >
                <CreditCard className="h-4 w-4" /> Ir a Caja
              </Button>
            )}
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
