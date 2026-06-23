"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CreditCard, Hash, ShoppingBag, SplitSquareHorizontal, User } from "lucide-react";
import type { PaymentMethod, PaymentBreakdown } from "@/types";
import { PageHeader } from "@/components/shared/page-header";
import { Icon } from "@/components/shared/icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaymentDialog } from "@/components/checkout/payment-dialog";
import { SplitBillDialog } from "@/components/checkout/split-bill-dialog";
import { PAYMENT_METHODS } from "@/lib/payments";
import { SALE_TYPES, SALE_TYPE_MAP, type SaleTypeId } from "@/lib/sale-types";
import { useOrderStore, orderSelectors, TAX_RATE } from "@/store/order.store";
import { useInventoryStore } from "@/store/inventory.store";
import { useMenuStore } from "@/store/menu.store";
import { useTablesStore } from "@/store/tables.store";
import { useSalesStore } from "@/store/sales.store";
import { useRecipesStore } from "@/store/recipes.store";
import { cn, formatCurrency } from "@/lib/utils";

const TIP_OPTIONS = [0, 0.05, 0.1, 0.15];

export default function CheckoutPage() {
  const storeLines = useOrderStore((s) => s.lines);
  const storeTable = useOrderStore((s) => s.tableNumber);
  const clear = useOrderStore((s) => s.clear);
  const setStoreTable = useOrderStore((s) => s.setTable);
  const applySale = useInventoryStore((s) => s.applySale);
  const allTables = useTablesStore((s) => s.tables);
  const freeTable = useTablesStore((s) => s.free);
  const recordSale = useSalesStore((s) => s.record);
  const setAvailable = useMenuStore((s) => s.setAvailable);
  const recipes = useRecipesStore((s) => s.recipes);

  const lines = storeLines;
  const [table, setTableLocal] = useState<number | null>(storeTable ?? null);
  const [saleType, setSaleType] = useState<SaleTypeId>("dine_in");
  const [tipRate, setTipRate] = useState(0.1);
  const [discount, setDiscount] = useState(0);
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [waiter, setWaiter] = useState("");
  const [payOpen, setPayOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);

  // Sincronizar table local cuando el store cambia (ej. navegando desde salón)
  useEffect(() => { setTableLocal(storeTable ?? null); }, [storeTable]);

  const st = SALE_TYPE_MAP[saleType];

  const subtotal = useMemo(() => orderSelectors.subtotal(lines), [lines]);
  const autoDiscount = st.full ? subtotal : Math.round(subtotal * (st.discountPct ?? 0));
  const effectiveDiscount = Math.min(discount + autoDiscount, subtotal);
  const taxedBase = Math.max(subtotal - effectiveDiscount, 0);
  const tax = st.noTax ? 0 : Math.round(taxedBase * TAX_RATE);
  const tip = st.full ? 0 : Math.round(subtotal * tipRate);
  const total = taxedBase + tax + tip;

  const breakdown: PaymentBreakdown = { subtotal, tax, taxRate: st.noTax ? 0 : TAX_RATE, discount: effectiveDiscount, tip, total };

  const completeSale = () => {
    const ref = table ? `mesa ${table}` : "mostrador";
    const { affected, depletedItemIds } = applySale(ref, lines.map((l) => ({ productId: l.product.id, quantity: l.quantity })));
    if (depletedItemIds.length > 0) {
      const affected86: string[] = [];
      recipes.forEach((rc) => {
        const uses = rc.ingredients.some((ing) => depletedItemIds.includes(ing.inventoryId));
        if (uses && rc.productId) { setAvailable(rc.productId, false); affected86.push(rc.name); }
      });
      if (affected86.length > 0) toast.warning("86 automático", { description: `Agotado: ${affected86.join(", ")}` });
    }
    recordSale({ total, items: orderSelectors.count(lines), method, saleType: st.label, table, tip, waiter: waiter.trim() || "Sin asignar" });
    if (table) freeTable(table);
    clear();
    toast.success("Venta registrada", { description: affected > 0 ? `${st.label} · ${affected} salidas de inventario` : st.label });
  };

  const changeTable = (value: string) => {
    const next = value === "none" ? null : Number(value);
    setTableLocal(next);
    setStoreTable(next); // intercambia lines automáticamente vía store
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caja y Cobro"
        description={table ? `Cobrando mesa ${table}` : "Venta directa"}
        icon={<CreditCard className="h-5 w-5" />}
        actions={<Badge variant="secondary">{orderSelectors.count(lines)} ítems</Badge>}
      />

      {/* Datos de la venta: mesa + tipo */}
      <Card>
        <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Mesa / origen</label>
            <Select value={table === null ? "none" : String(table)} onValueChange={changeTable}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">
                  <span className="flex items-center gap-2"><ShoppingBag className="h-4 w-4" /> Venta directa</span>
                </SelectItem>
                {allTables.map((t) => (
                  <SelectItem key={t.id} value={String(t.number)}>
                    <span className="flex items-center gap-2"><Hash className="h-4 w-4" /> Mesa {t.number} · {t.zone}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Mesero</label>
            <div className="relative">
              <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Nombre del mesero"
                value={waiter}
                onChange={(e) => setWaiter(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Tipo de venta</label>
            <Select value={saleType} onValueChange={(v) => setSaleType(v as SaleTypeId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALE_TYPES.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="flex items-center gap-2">
                      <Icon name={s.icon} className="h-4 w-4" /> {s.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        {(st.discountPct || st.full || st.noTax) && (
          <div className="border-t border-border px-4 py-2.5">
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Icon name={st.icon} className="h-3.5 w-3.5" />
              <span>
                <strong className="text-foreground">{st.label}:</strong> {st.hint}
                {st.full && " · total $0"}
                {st.discountPct && ` · -${Math.round(st.discountPct * 100)}% automático`}
                {st.noTax && " · sin IVA"}
              </span>
            </p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_400px]">
        {/* Detalle */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de la cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3 rounded-xl border border-border p-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-muted text-xl">
                  {l.product.image}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{l.product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.quantity} × {formatCurrency(l.unitPrice)}
                  </p>
                </div>
                <span className="text-sm font-semibold">{formatCurrency(orderSelectors.lineTotal(l))}</span>
              </div>
            ))}

            <Separator className="my-3" />

            <div className={cn(st.full && "pointer-events-none opacity-50")}>
              <p className="mb-2 text-sm font-semibold">Propina sugerida</p>
              <div className="grid grid-cols-4 gap-2">
                {TIP_OPTIONS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTipRate(t)}
                    className={cn(
                      "rounded-lg border py-2 text-sm font-medium transition-colors",
                      tipRate === t ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"
                    )}
                  >
                    {t === 0 ? "Sin propina" : `${t * 100}%`}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-2 text-sm font-semibold">Descuento adicional</p>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={discount || ""}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                />
                <Button variant="outline" onClick={() => setDiscount(Math.round(subtotal * 0.1))}>
                  -10%
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pago */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={formatCurrency(subtotal)} />
              {effectiveDiscount > 0 && (
                <Row label={st.full ? `Descuento (${st.label})` : "Descuento"} value={`- ${formatCurrency(effectiveDiscount)}`} accent />
              )}
              <Row label={st.noTax ? "IVA (exento)" : `IVA (${Math.round(TAX_RATE * 100)}%)`} value={formatCurrency(tax)} muted />
              <Row label="Propina" value={formatCurrency(tip)} muted />
              <Separator className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Total a pagar</span>
                <span className="text-2xl font-bold text-primary">{formatCurrency(total)}</span>
              </div>
              <Button variant="outline" className="mt-3 w-full" onClick={() => setSplitOpen(true)} disabled={total <= 0}>
                <SplitSquareHorizontal className="h-4 w-4" /> Dividir cuenta
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Método de pago</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMethod(m.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                      method === m.id ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:bg-muted"
                    )}
                  >
                    <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", m.color)}>
                      <Icon name={m.icon} className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium">{m.label}</p>
                      <p className="text-[11px] text-muted-foreground">{m.hint}</p>
                    </div>
                  </button>
                ))}
              </div>
              <Button size="lg" className="mt-4 w-full text-base" onClick={() => setPayOpen(true)}>
                Cobrar {formatCurrency(total)}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <SplitBillDialog
        open={splitOpen}
        onOpenChange={setSplitOpen}
        lines={lines}
        subtotal={subtotal}
        total={total}
        onComplete={completeSale}
      />

      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        method={method}
        breakdown={breakdown}
        table={table}
        saleType={st.label}
        waiter={waiter.trim() || "Sin asignar"}
        onComplete={completeSale}
      />
    </div>
  );
}

function Row({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-muted-foreground" : ""}>{label}</span>
      <span className={cn("font-medium", muted && "text-muted-foreground", accent && "text-success")}>{value}</span>
    </div>
  );
}
