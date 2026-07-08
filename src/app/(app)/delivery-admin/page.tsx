"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapPin, Bike, Phone, Package, User, Search, Filter, Plus,
  CheckCircle2, Clock, AlertTriangle, TrendingUp, DollarSign,
} from "lucide-react";
import { useDeliveryStore, DELIVERY_STATUS_LABEL, DELIVERY_STATUS_COLOR, type DeliveryOrder, type DeliveryStatus } from "@/store/delivery.store";
import { useEmployeesStore } from "@/store/employees.store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn, formatCurrency } from "@/lib/utils";

const ALL_STATUSES: DeliveryStatus[] = ["pending", "assigned", "picked_up", "on_the_way", "arrived", "delivered", "cancelled"];

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

function fmtElapsed(from: number) {
  const mins = Math.round((Date.now() - from) / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function NewOrderDialog({ onClose, onSave }: { onClose: () => void; onSave: (o: Parameters<ReturnType<typeof useDeliveryStore.getState>["addOrder"]>[0]) => void }) {
  const [form, setForm] = useState({
    customerName: "", customerPhone: "", address: "", neighborhood: "",
    notes: "", paymentMethod: "Efectivo", total: "",
    items: [{ name: "", quantity: 1 }],
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border bg-background p-5 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-lg">Nuevo domicilio</h3>
        <div className="space-y-3">
          <Input placeholder="Nombre cliente" value={form.customerName} onChange={(e) => set("customerName", e.target.value)} />
          <Input placeholder="Teléfono" value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} />
          <Input placeholder="Dirección" value={form.address} onChange={(e) => set("address", e.target.value)} />
          <Input placeholder="Barrio" value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
          <Input placeholder="Total $" type="number" value={form.total} onChange={(e) => set("total", e.target.value)} />
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Productos</p>
            {form.items.map((item, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Producto" className="flex-1" value={item.name} onChange={(e) => {
                  const items = [...form.items];
                  items[i] = { ...items[i], name: e.target.value };
                  setForm((f) => ({ ...f, items }));
                }} />
                <Input placeholder="Cant" type="number" className="w-16" value={item.quantity} onChange={(e) => {
                  const items = [...form.items];
                  items[i] = { ...items[i], quantity: Number(e.target.value) || 1 };
                  setForm((f) => ({ ...f, items }));
                }} />
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { name: "", quantity: 1 }] }))}>
              + Producto
            </Button>
          </div>
          <Input placeholder="Notas (opcional)" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.paymentMethod} onChange={(e) => set("paymentMethod", e.target.value)}>
            <option>Efectivo</option>
            <option>Transferencia</option>
            <option>Tarjeta</option>
            <option>Datáfono</option>
          </select>
        </div>
        <div className="flex gap-2 justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={!form.customerName || !form.address || !form.total} onClick={() => {
            onSave({
              code: `D-${Date.now().toString(36).slice(-4).toUpperCase()}`,
              customerName: form.customerName,
              customerPhone: form.customerPhone,
              address: form.address,
              neighborhood: form.neighborhood,
              lat: 4.6097 + (Math.random() - 0.5) * 0.05,
              lng: -74.0817 + (Math.random() - 0.5) * 0.05,
              items: form.items.filter((i) => i.name),
              total: Number(form.total) || 0,
              tip: 0,
              status: "pending",
              driverId: null,
              driverName: null,
              notes: form.notes,
              paymentMethod: form.paymentMethod,
            });
            onClose();
          }}>Crear pedido</Button>
        </div>
      </div>
    </div>
  );
}

export default function DeliveryAdminPage() {
  const { orders, addOrder, assignDriver, updateStatus, removeOrder, seedDemo } = useDeliveryStore();
  const employees = useEmployeesStore((s) => s.employees);

  useEffect(() => { seedDemo(); }, [seedDemo]);
  const drivers = useMemo(() => employees.filter((e) => e.role === "domiciliario" && e.active), [employees]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeliveryStatus | "all">("all");
  const [showNew, setShowNew] = useState(false);

  const filtered = useMemo(() => {
    let list = orders;
    if (statusFilter !== "all") list = list.filter((o) => o.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((o) =>
        o.code.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.address.toLowerCase().includes(q) ||
        (o.driverName?.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  }, [orders, statusFilter, search]);

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }, []);
  const todayOrders = useMemo(() => orders.filter((o) => o.createdAt >= today), [orders, today]);
  const todayDelivered = useMemo(() => todayOrders.filter((o) => o.status === "delivered").length, [todayOrders]);
  const todayActive = useMemo(() => todayOrders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length, [todayOrders]);
  const todayRevenue = useMemo(() => todayOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0), [todayOrders]);
  const avgTime = useMemo(() => {
    const delivered = todayOrders.filter((o) => o.status === "delivered" && o.assignedAt && o.deliveredAt);
    if (!delivered.length) return 0;
    return Math.round(delivered.reduce((s, o) => s + (o.deliveredAt! - o.assignedAt!), 0) / delivered.length / 60000);
  }, [todayOrders]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <PageHeader
          title="Domicilios"
          description="Gestión de entregas a domicilio"
          icon={<MapPin className="h-5 w-5" />}
        />
        <Button onClick={() => setShowNew(true)}>
          <Plus className="mr-1 h-4 w-4" /> Nuevo domicilio
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10"><Package className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-2xl font-bold">{todayActive}</p>
              <p className="text-xs text-muted-foreground">Activos</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold">{todayDelivered}</p>
              <p className="text-xs text-muted-foreground">Entregados</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10"><Clock className="h-5 w-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold">{avgTime ? `${avgTime}m` : "—"}</p>
              <p className="text-xs text-muted-foreground">Tiempo prom.</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10"><DollarSign className="h-5 w-5 text-violet-600" /></div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(todayRevenue)}</p>
              <p className="text-xs text-muted-foreground">Vendido hoy</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Drivers active */}
      {drivers.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2"><Bike className="h-4 w-4" /> Domiciliarios activos</h3>
          <div className="flex flex-wrap gap-2">
            {drivers.map((d) => {
              const activeOrders = orders.filter((o) => o.driverId === d.id && !["delivered", "cancelled"].includes(o.status));
              return (
                <div key={d.id} className="flex items-center gap-2 rounded-lg border p-2.5 pr-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10 text-xs font-bold text-orange-600">
                    {d.name[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-[11px] text-muted-foreground">{activeOrders.length} pedido{activeOrders.length !== 1 ? "s" : ""} activo{activeOrders.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar pedido, cliente, dirección…" className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setStatusFilter("all")}
            className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors", statusFilter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground")}
          >
            Todos ({orders.length})
          </button>
          {ALL_STATUSES.map((s) => {
            const count = orders.filter((o) => o.status === s).length;
            if (!count) return null;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn("rounded-full px-3 py-1 text-xs font-medium border transition-colors", statusFilter === s ? DELIVERY_STATUS_COLOR[s] : "border-border text-muted-foreground hover:text-foreground")}
              >
                {DELIVERY_STATUS_LABEL[s]} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent>
            <MapPin className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium text-muted-foreground">Sin domicilios</p>
            <p className="mt-1 text-xs text-muted-foreground">Crea un nuevo pedido de domicilio para empezar.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left">
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Dirección</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Domiciliario</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Tiempo</th>
                <th className="px-4 py-3 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold text-primary">{order.code}</span>
                    <p className="text-[10px] text-muted-foreground">{fmtDate(order.createdAt)} {fmtTime(order.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.customerName}</p>
                    <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="truncate text-xs">{order.address}</p>
                    <p className="text-[10px] text-muted-foreground">{order.neighborhood}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn("text-[10px]", DELIVERY_STATUS_COLOR[order.status])}>
                      {DELIVERY_STATUS_LABEL[order.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {order.driverName ? (
                      <div className="flex items-center gap-1.5">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-500/10 text-[10px] font-bold text-orange-600">
                          {order.driverName[0]?.toUpperCase()}
                        </div>
                        <span className="text-xs">{order.driverName}</span>
                      </div>
                    ) : order.status === "pending" ? (
                      <select
                        className="rounded border bg-background px-2 py-1 text-xs"
                        defaultValue=""
                        onChange={(e) => {
                          const driver = drivers.find((d) => d.id === e.target.value);
                          if (driver) assignDriver(order.id, driver.id, driver.name);
                        }}
                      >
                        <option value="" disabled>Asignar...</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                        {drivers.length === 0 && <option disabled>Sin domiciliarios</option>}
                      </select>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium">{formatCurrency(order.total)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{fmtElapsed(order.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {order.status === "pending" && !order.driverId && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => {
                          if (confirm("¿Cancelar este domicilio?")) updateStatus(order.id, "cancelled");
                        }}>Cancelar</Button>
                      )}
                      {order.status === "cancelled" && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500" onClick={() => removeOrder(order.id)}>Eliminar</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewOrderDialog onClose={() => setShowNew(false)} onSave={addOrder} />}
    </div>
  );
}
