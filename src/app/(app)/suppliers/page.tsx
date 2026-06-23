"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Truck, Plus, ShoppingCart, Pencil, Trash2, Phone, Mail, Package, Minus } from "lucide-react";
import type { Supplier, PurchaseLine } from "@/types";
import { useSuppliersStore, emptySupplier } from "@/store/suppliers.store";
import { useInventoryStore } from "@/store/inventory.store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils";

const CATEGORIES = ["Carnes", "Lácteos", "Verduras", "Frutas", "Panadería", "Abarrotes", "Bebidas", "Pescados", "Congelados"];

export default function SuppliersPage() {
  const { suppliers, purchases, addSupplier, updateSupplier, removeSupplier, registerPurchase } = useSuppliersStore();
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [buyOpen, setBuyOpen] = useState(false);

  const openNew = () => { setEditing(emptySupplier()); setFormOpen(true); };
  const openEdit = (s: Supplier) => { setEditing(s); setFormOpen(true); };
  const save = (s: Supplier) => {
    if (suppliers.some((x) => x.id === s.id)) { updateSupplier(s); toast.success("Proveedor actualizado"); }
    else { addSupplier(s); toast.success("Proveedor vinculado"); }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proveedores y compras"
        description="Vincula proveedores y registra compras que suman al inventario"
        icon={<Truck className="h-5 w-5" />}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={openNew}><Plus className="h-4 w-4" /> Proveedor</Button>
            <Button size="sm" onClick={() => setBuyOpen(true)}><ShoppingCart className="h-4 w-4" /> Registrar compra</Button>
          </>
        }
      />

      <Tabs defaultValue="suppliers">
        <TabsList>
          <TabsTrigger value="suppliers">Proveedores <Badge variant="secondary">{suppliers.length}</Badge></TabsTrigger>
          <TabsTrigger value="purchases">Compras <Badge variant="secondary">{purchases.length}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="suppliers">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suppliers.map((s) => (
              <Card key={s.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Truck className="h-5 w-5" /></div>
                    <div>
                      <p className="font-semibold leading-tight">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.category}</p>
                    </div>
                  </div>
                  <Badge variant={s.active ? "success" : "secondary"}>{s.active ? "Activo" : "Inactivo"}</Badge>
                </div>
                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>{s.contact}</p>
                  <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> {s.phone}</p>
                  <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> {s.email}</p>
                  {s.nit && <p className="text-xs">NIT: {s.nit}</p>}
                </div>
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /> Editar</Button>
                  <Button size="sm" variant="ghost" onClick={() => { removeSupplier(s.id); toast.success("Proveedor desvinculado"); }} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="purchases">
          {purchases.length === 0 ? (
            <EmptyState icon={<ShoppingCart />} title="Sin compras registradas" description="Registra una compra para sumar stock al inventario y dejar el movimiento en el kardex." action={<Button onClick={() => setBuyOpen(true)}><Plus className="h-4 w-4" /> Registrar compra</Button>} />
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Orden</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead className="text-right">Ítems</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchases.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.code}</TableCell>
                      <TableCell>{p.supplierName}</TableCell>
                      <TableCell className="text-muted-foreground">{p.date}</TableCell>
                      <TableCell className="text-right">{p.lines.length}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(p.total)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <SupplierFormDialog supplier={editing} open={formOpen} onOpenChange={setFormOpen} onSave={save} />
      <PurchaseDialog
        suppliers={suppliers}
        open={buyOpen}
        onOpenChange={setBuyOpen}
        onRegister={(supplier, lines) => { registerPurchase(supplier, lines); toast.success("Compra registrada", { description: `${lines.length} insumos sumados al inventario` }); }}
      />
    </div>
  );
}

function SupplierFormDialog({ supplier, open, onOpenChange, onSave }: { supplier: Supplier | null; open: boolean; onOpenChange: (v: boolean) => void; onSave: (s: Supplier) => void }) {
  const [draft, setDraft] = useState<Supplier | null>(supplier);
  useEffect(() => { if (open) setDraft(supplier ? { ...supplier } : null); }, [open, supplier]);
  if (!draft) return null;
  const set = (patch: Partial<Supplier>) => setDraft({ ...draft, ...patch });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{supplier?.name ? "Editar proveedor" : "Vincular proveedor"}</DialogTitle>
          <DialogDescription>Datos de contacto del proveedor.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div><label className="mb-1.5 block text-sm font-medium">Razón social</label><Input value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Ej: Frigorífico La 70" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1.5 block text-sm font-medium">Contacto</label><Input value={draft.contact} onChange={(e) => set({ contact: e.target.value })} /></div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Categoría</label>
              <Select value={draft.category} onValueChange={(v) => set({ category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="mb-1.5 block text-sm font-medium">Teléfono</label><Input value={draft.phone} onChange={(e) => set({ phone: e.target.value })} /></div>
            <div><label className="mb-1.5 block text-sm font-medium">NIT</label><Input value={draft.nit ?? ""} onChange={(e) => set({ nit: e.target.value })} /></div>
          </div>
          <div><label className="mb-1.5 block text-sm font-medium">Correo</label><Input type="email" value={draft.email} onChange={(e) => set({ email: e.target.value })} /></div>
          <div className="flex items-center justify-between rounded-xl border border-border p-3">
            <span className="text-sm font-medium">Proveedor activo</span>
            <Switch checked={draft.active} onCheckedChange={(v) => set({ active: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { if (draft.name.trim()) { onSave(draft); onOpenChange(false); } }} disabled={!draft.name.trim()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PurchaseDialog({ suppliers, open, onOpenChange, onRegister }: { suppliers: Supplier[]; open: boolean; onOpenChange: (v: boolean) => void; onRegister: (s: Supplier, lines: PurchaseLine[]) => void }) {
  const inventory = useInventoryStore((s) => s.items);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [lines, setLines] = useState<PurchaseLine[]>([]);

  const addLine = () => setLines((l) => [...l, { inventoryId: "", name: "", unit: "", quantity: 1, unitCost: 0 }]);
  const update = (i: number, patch: Partial<PurchaseLine>) => setLines((l) => l.map((x, idx) => (idx === i ? { ...x, ...patch } : x)));
  const pickItem = (i: number, id: string) => {
    const it = inventory.find((x) => x.id === id);
    if (it) update(i, { inventoryId: id, name: it.name, unit: it.unit, unitCost: it.cost });
  };
  const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const supplier = suppliers.find((s) => s.id === supplierId);
  const valid = supplier && lines.length > 0 && lines.every((l) => l.inventoryId && l.quantity > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setLines([]); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar compra</DialogTitle>
          <DialogDescription>Suma stock al inventario y registra la entrada en el kardex.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Proveedor</label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger><SelectValue placeholder="Selecciona el proveedor" /></SelectTrigger>
              <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="scrollbar-thin max-h-64 space-y-2 overflow-y-auto">
            {lines.length === 0 && <p className="rounded-lg border border-dashed border-border py-5 text-center text-sm text-muted-foreground">Agrega los insumos comprados</p>}
            {lines.map((l, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-border p-2.5">
                <div className="flex items-center gap-2">
                  <Select value={l.inventoryId} onValueChange={(v) => pickItem(i, v)}>
                    <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="Insumo" /></SelectTrigger>
                    <SelectContent>{inventory.map((it) => <SelectItem key={it.id} value={it.id}>{it.name} · {it.unit}</SelectItem>)}</SelectContent>
                  </Select>
                  <button onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Minus className="h-4 w-4" /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="mb-1 block text-[11px] text-muted-foreground">Cantidad ({l.unit || "—"})</label><Input type="number" min={0} step="0.001" value={l.quantity} onChange={(e) => update(i, { quantity: Number(e.target.value) })} className="h-9" /></div>
                  <div><label className="mb-1 block text-[11px] text-muted-foreground">Costo unit.</label><Input type="number" min={0} value={l.unitCost} onChange={(e) => update(i, { unitCost: Number(e.target.value) })} className="h-9" /></div>
                  <div><label className="mb-1 block text-[11px] text-muted-foreground">Subtotal</label><div className="flex h-9 items-center justify-end rounded-lg border border-border bg-muted/40 px-3 text-sm font-semibold">{formatCurrency(l.quantity * l.unitCost)}</div></div>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-4 w-4" /> Agregar insumo</Button>
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm font-medium">Total de la compra</span>
            <span className="text-lg font-bold">{formatCurrency(total)}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button disabled={!valid} onClick={() => { if (supplier) { onRegister(supplier, lines); onOpenChange(false); setLines([]); } }}>
            <Package className="h-4 w-4" /> Registrar e ingresar a inventario
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
