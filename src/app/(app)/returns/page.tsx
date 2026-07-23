"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { PAYMENT_METHODS } from "@/lib/payments";
import { formatCurrency } from "@/lib/utils";
import { useMenuStore } from "@/store/menu.store";
import { returnsService, type CreditNote, type CreateCreditNotePayload } from "@/services/returns.service";

export default function ReturnsPage() {
  const [notes, setNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const products = useMenuStore((s) => s.products);

  const load = () => {
    setLoading(true);
    returnsService.getAll()
      .then(setNotes)
      .catch(() => setNotes([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const totalReturns = notes.reduce((s, n) => s + n.total, 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Devoluciones"
        description="Notas de crédito y reintegro de inventario"
        icon={<RotateCcw className="h-5 w-5" />}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Nueva devolución
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Devoluciones</p>
            <p className="text-2xl font-bold">{notes.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Total reintegrado</p>
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalReturns)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Con reintegro de stock</p>
            <p className="text-2xl font-bold">
              {notes.reduce((s, n) => s + n.lines.filter((l) => l.restocked).length, 0)} ítems
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Historial de notas de crédito</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
          ) : notes.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sin devoluciones registradas</p>
          ) : (
            <div className="space-y-2">
              {notes.map((n) => (
                <div key={n.id} className="flex flex-col gap-1 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold">{n.code}</span>
                      <Badge variant="secondary">{formatCurrency(n.total)}</Badge>
                      {n.user && <span className="text-xs text-muted-foreground">· {n.user}</span>}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.reason}</p>
                    {n.lines.length > 0 && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {n.lines.map((l) => `${l.quantity}× ${l.productName}${l.restocked ? " ↩" : ""}`).join(" · ")}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(n.createdAt).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <NewReturnDialog
        open={open}
        onOpenChange={setOpen}
        products={products}
        onCreated={(note) => {
          setNotes((prev) => [note, ...prev]);
          toast.success(`Nota de crédito ${note.code} creada`, {
            description: note.lines.some((l) => l.restocked) ? "Inventario reintegrado" : "Sin reintegro de stock",
          });
        }}
      />
    </div>
  );
}

function NewReturnDialog({
  open, onOpenChange, products, onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: { id: string; name: string; price: number; restockable?: boolean }[];
  onCreated: (note: CreditNote) => void;
}) {
  const [productId, setProductId] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [method, setMethod] = useState("cash");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const product = products.find((p) => String(p.id) === String(productId));
  const total = product ? product.price * quantity : 0;

  const reset = () => { setProductId(""); setQuantity(1); setMethod("cash"); setReason(""); };

  const submit = async () => {
    if (!product) { toast.error("Selecciona un producto"); return; }
    if (!reason.trim()) { toast.error("El motivo de devolución es obligatorio"); return; }
    setSaving(true);
    const payload: CreateCreditNotePayload = {
      total,
      method,
      reason: reason.trim(),
      lines: [{ productId: Number(product.id), quantity, unitPrice: product.price }],
    };
    try {
      const note = await returnsService.create(payload);
      onCreated(note);
      reset();
      onOpenChange(false);
    } catch (err) {
      toast.error("No se pudo registrar la devolución", { description: err instanceof Error ? err.message.slice(0, 100) : "" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva devolución</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Producto</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Selecciona un producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatCurrency(p.price)} {p.restockable === false ? "(no reintegra)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cantidad</label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Método de reembolso</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              >
                {PAYMENT_METHODS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Motivo de devolución <span className="text-destructive">*</span></label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej. Bebida sellada sin abrir, error de pedido…" />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {product?.restockable === false ? "No reintegra stock (comida preparada)" : "Reintegrará stock según receta"}
            </span>
            <span className="text-lg font-bold">{formatCurrency(total)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />} Registrar devolución
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
