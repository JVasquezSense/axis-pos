"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ShieldCheck, Building2, Globe, Plus, MoreHorizontal,
  Pencil, Trash2, ToggleLeft, TrendingUp, TrendingDown,
  CheckCircle, ShoppingBag, ChefHat, Boxes, BookOpen,
  LayoutDashboard, CalendarDays, Users, Truck, UserCheck,
  BarChart3, Smartphone, Loader2, UserPlus, Eye, EyeOff,
} from "lucide-react";
import type { Tenant, TenantFeatures, TenantPlan, TenantStatus, TenantUser } from "@/types";
import { saasService } from "@/services/saas.service";
import { useAsync } from "@/hooks/use-async";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DonutChart } from "@/components/reports/charts-lazy";
import { SalesByHourChart } from "@/components/dashboard/charts-lazy";
import { TENANT_STATUS, PLAN_LABEL } from "@/lib/status";
import { formatCurrency, formatNumber } from "@/lib/utils";

// ─── Constantes ──────────────────────────────────────────────────────────────

const PLAN_STYLE: Record<string, string> = {
  starter: "bg-muted text-muted-foreground",
  growth: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  enterprise: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
};

const FEATURE_LIST: { id: keyof TenantFeatures; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "pos", label: "POS / Caja", icon: ShoppingBag, desc: "Punto de venta y checkout" },
  { id: "kitchen", label: "Pantalla Cocina", icon: ChefHat, desc: "KDS y gestión de tickets" },
  { id: "inventory", label: "Inventario", icon: Boxes, desc: "Control de insumos y kardex" },
  { id: "recipes", label: "Recetas", icon: BookOpen, desc: "Fichas técnicas y costos" },
  { id: "salon", label: "Salón / Mesas", icon: LayoutDashboard, desc: "Mapa de mesas y estados" },
  { id: "reservations", label: "Reservaciones", icon: CalendarDays, desc: "Agenda y confirmaciones" },
  { id: "crm", label: "CRM Clientes", icon: Users, desc: "Base de clientes y fidelización" },
  { id: "suppliers", label: "Proveedores", icon: Truck, desc: "Órdenes de compra y pagos" },
  { id: "employees", label: "Empleados", icon: UserCheck, desc: "Equipo y roles" },
  { id: "reports", label: "Reportes", icon: BarChart3, desc: "Análisis ejecutivo" },
  { id: "website", label: "Carta Online", icon: Globe, desc: "Menú público del restaurante" },
  { id: "web_orders", label: "Pedidos Web", icon: Smartphone, desc: "Órdenes desde la carta" },
];

const DEFAULT_FEATURES: TenantFeatures = {
  pos: true, kitchen: true, inventory: true, recipes: true,
  salon: true, reservations: true, crm: true, suppliers: true,
  employees: true, reports: true, website: true, web_orders: true,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { data: metrics, loading: mLoading } = useAsync(() => saasService.getMetrics());
  const { data: rawTenants, loading: tLoading } = useAsync(() => saasService.getTenants());

  const [tenants, setTenants] = useState<Tenant[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [featuresTenant, setFeaturesTenant] = useState<Tenant | null>(null);
  const [usersTenant, setUsersTenant] = useState<Tenant | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState(false);

  const list = tenants ?? rawTenants ?? [];

  const handleCreate = (t: Tenant) => {
    setTenants([t, ...list]);
    setCreateOpen(false);
    toast.success("Restaurante creado", { description: t.name });
  };

  const handleUpdate = (t: Tenant) => {
    setTenants(list.map((x) => (x.id === t.id ? t : x)));
    setEditTenant(null);
    toast.success("Restaurante actualizado", { description: t.name });
  };

  const handleFeaturesUpdate = (t: Tenant) => {
    setTenants(list.map((x) => (x.id === t.id ? t : x)));
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await saasService.deleteTenant(deleteTarget.id);
      setTenants(list.filter((x) => x.id !== deleteTarget.id));
      toast.success("Restaurante eliminado");
    } catch {
      toast.error("Error al eliminar");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin · SaaS"
        description="Gestión global de la plataforma multi-tenant"
        icon={<ShieldCheck className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Nuevo restaurante
          </Button>
        }
      />

      {/* KPIs */}
      {mLoading || !metrics ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.kpis.map((kpi, i) => <KpiCard key={kpi.id} kpi={kpi} index={i} />)}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Crecimiento de MRR</CardTitle>
              <p className="text-sm text-muted-foreground">Ingreso recurrente mensual</p>
            </div>
            {metrics && <Badge variant="success">ARPA {formatCurrency(metrics.arpa)}</Badge>}
          </CardHeader>
          <CardContent>
            {metrics ? <SalesByHourChart data={metrics.mrrTrend} /> : <Skeleton className="h-[260px] w-full" />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Distribución por plan</CardTitle></CardHeader>
          <CardContent>
            {metrics ? <DonutChart data={metrics.planMix} /> : <Skeleton className="h-[240px] w-full" />}
          </CardContent>
        </Card>
      </div>

      {/* Tenant table */}
      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" /> Restaurantes
          </CardTitle>
          {list.length > 0 && <Badge variant="secondary">{list.length} cuentas</Badge>}
        </CardHeader>
        {tLoading && !rawTenants ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Restaurante</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">MRR</TableHead>
                <TableHead className="text-right">Sedes</TableHead>
                <TableHead className="text-right">Pedidos/mes</TableHead>
                <TableHead className="text-center">Funciones</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((t) => (
                <TenantRow
                  key={t.id}
                  tenant={t}
                  onEdit={() => setEditTenant(t)}
                  onFeatures={() => setFeaturesTenant(t)}
                  onUsers={() => setUsersTenant(t)}
                  onDelete={() => setDeleteTarget(t)}
                />
              ))}
            </TableBody>
          </Table>
        )}
        {!tLoading && list.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Sin restaurantes. Crea el primero.
          </p>
        )}
      </Card>

      {/* Dialogs */}
      <TenantFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSave={handleCreate}
      />
      <TenantFormDialog
        open={!!editTenant}
        onOpenChange={(v) => { if (!v) setEditTenant(null); }}
        initialData={editTenant ?? undefined}
        onSave={handleUpdate}
      />
      <FeaturesDialog
        tenant={featuresTenant}
        onClose={() => setFeaturesTenant(null)}
        onUpdate={handleFeaturesUpdate}
      />
      <UsersDialog
        tenant={usersTenant}
        onClose={() => setUsersTenant(null)}
      />

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar restaurante</DialogTitle>
            <DialogDescription>
              Esto eliminará <strong>{deleteTarget?.name}</strong> y todos sus datos permanentemente.
              Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── TenantRow ────────────────────────────────────────────────────────────────

function TenantRow({
  tenant, onEdit, onFeatures, onUsers, onDelete,
}: {
  tenant: Tenant;
  onEdit: () => void;
  onFeatures: () => void;
  onUsers: () => void;
  onDelete: () => void;
}) {
  const status = TENANT_STATUS[tenant.status];
  const enabledCount = tenant.features
    ? Object.values(tenant.features).filter(Boolean).length
    : 12;

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-lg">{tenant.logo}</div>
          <div>
            <p className="font-medium">{tenant.name}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" /> {tenant.city || "—"} · desde {tenant.joinedAt?.slice(0, 10) ?? "—"}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${PLAN_STYLE[tenant.plan]}`}>
          {PLAN_LABEL[tenant.plan]}
        </span>
      </TableCell>
      <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
      <TableCell className="text-right font-semibold">{formatCurrency(tenant.mrr)}</TableCell>
      <TableCell className="text-right">{tenant.locations}</TableCell>
      <TableCell className="text-right">{formatNumber(tenant.ordersMonth)}</TableCell>
      <TableCell className="text-center">
        <button
          onClick={onFeatures}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {enabledCount}/12 activas
        </button>
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onFeatures}>
              <ToggleLeft className="mr-2 h-4 w-4" /> Funcionalidades
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onUsers}>
              <UserPlus className="mr-2 h-4 w-4" /> Usuarios
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}

// ─── TenantFormDialog ─────────────────────────────────────────────────────────

function TenantFormDialog({
  open, onOpenChange, initialData, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialData?: Tenant;
  onSave: (t: Tenant) => void;
}) {
  const isEdit = !!initialData;
  const [name, setName] = useState(initialData?.name ?? "");
  const [logo, setLogo] = useState(initialData?.logo ?? "🍔");
  const [city, setCity] = useState(initialData?.city ?? "");
  const [plan, setPlan] = useState<TenantPlan>(initialData?.plan ?? "starter");
  const [status, setStatus] = useState<TenantStatus>(initialData?.status ?? "trial");
  const [locations, setLocations] = useState(initialData?.locations ?? 1);
  const [saving, setSaving] = useState(false);

  // Reset on open
  useState(() => {
    if (open && initialData) {
      setName(initialData.name);
      setLogo(initialData.logo);
      setCity(initialData.city);
      setPlan(initialData.plan);
      setStatus(initialData.status);
      setLocations(initialData.locations);
    } else if (open) {
      setName(""); setLogo("🍔"); setCity(""); setPlan("starter"); setStatus("trial"); setLocations(1);
    }
  });

  const valid = name.trim().length > 0;

  const submit = async () => {
    if (!valid) return;
    setSaving(true);
    try {
      const payload = { name: name.trim(), logo, city, plan, status, locations, features: initialData?.features ?? DEFAULT_FEATURES };
      let saved: Tenant;
      if (isEdit && initialData) {
        saved = await saasService.updateTenant(initialData.id, payload);
      } else {
        saved = await saasService.createTenant(payload);
      }
      onSave(saved);
    } catch {
      toast.error("Error al guardar restaurante");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar restaurante" : "Nuevo restaurante"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Modifica los datos del restaurante." : "Registra un nuevo restaurante en la plataforma."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-20">
              <label className="mb-1.5 block text-sm font-medium">Emoji</label>
              <Input value={logo} onChange={(e) => setLogo(e.target.value)} className="text-center text-xl" maxLength={4} />
            </div>
            <div className="flex-1">
              <label className="mb-1.5 block text-sm font-medium">Nombre del restaurante</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Burger House" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Ciudad</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ej: Bogotá" />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Sedes</label>
              <Input type="number" min={1} value={locations} onChange={(e) => setLocations(Number(e.target.value))} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Plan</label>
              <Select value={plan} onValueChange={(v) => setPlan(v as TenantPlan)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="growth">Growth</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Estado</label>
              <Select value={status} onValueChange={(v) => setStatus(v as TenantStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Prueba</SelectItem>
                  <SelectItem value="active">Activo</SelectItem>
                  <SelectItem value="past_due">Mora</SelectItem>
                  <SelectItem value="churned">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={!valid || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Guardar cambios" : "Crear restaurante"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── FeaturesDialog ───────────────────────────────────────────────────────────

function FeaturesDialog({
  tenant, onClose, onUpdate,
}: {
  tenant: Tenant | null;
  onClose: () => void;
  onUpdate: (t: Tenant) => void;
}) {
  const [features, setFeatures] = useState<TenantFeatures>(DEFAULT_FEATURES);
  const [saving, setSaving] = useState(false);
  const prevId = useState<string | null>(null);

  // Sync features when tenant changes
  if (tenant && tenant.id !== prevId[0]) {
    prevId[1](tenant.id);
    setFeatures(tenant.features ?? DEFAULT_FEATURES);
  }

  const toggle = (id: keyof TenantFeatures) =>
    setFeatures((f) => ({ ...f, [id]: !f[id] }));

  const save = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      await saasService.updateFeatures(tenant.id, features);
      onUpdate({ ...tenant, features });
      toast.success("Funcionalidades actualizadas");
      onClose();
    } catch {
      toast.error("Error al actualizar funcionalidades");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!tenant} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{tenant?.logo}</span>
            {tenant?.name} · Funcionalidades
          </DialogTitle>
          <DialogDescription>
            Activa o desactiva módulos para este restaurante.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FEATURE_LIST.map(({ id, label, icon: Icon, desc }) => (
            <div
              key={id}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
              </div>
              <Switch checked={features[id]} onCheckedChange={() => toggle(id)} />
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── UsersDialog ──────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  cashier: "Cajero",
  waiter: "Mesero",
  kitchen: "Cocina",
  warehouse: "Almacén",
};

function UsersDialog({ tenant, onClose }: { tenant: Tenant | null; onClose: () => void }) {
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);

  // form fields
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("cashier");

  const isEdit = !!editingUser;

  const prevId = useState<string | null>(null);
  if (tenant && tenant.id !== prevId[0]) {
    prevId[1](tenant.id);
    setLoading(true);
    saasService.getUsers(tenant.id).then((u) => { setUsers(u); setLoading(false); }).catch(() => setLoading(false));
  }

  const resetForm = () => {
    setUsername(""); setEmail(""); setPassword(""); setRole("cashier");
    setEditingUser(null); setShowPass(false);
  };

  const startEdit = (u: TenantUser) => {
    setEditingUser(u);
    setUsername(u.username);
    setEmail(u.email);
    setPassword("");
    setRole(u.role);
  };

  const apiError = (err: unknown, fallback: string) => {
    if (err instanceof Error) {
      try { return (JSON.parse(err.message) as { error?: string }).error ?? fallback; } catch { return err.message; }
    }
    return fallback;
  };

  const handleSave = async () => {
    if (!tenant) return;
    setSaving(true);
    try {
      if (isEdit && editingUser) {
        const payload: Record<string, string> = { username: username.trim(), email: email.trim(), role };
        if (password) payload.password = password;
        const updated = await saasService.updateUser(tenant.id, editingUser.id, payload);
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
        toast.success("Usuario actualizado", { description: updated.email });
      } else {
        const created = await saasService.createUser(tenant.id, { username: username.trim(), email: email.trim(), password, role });
        setUsers((prev) => [...prev, created]);
        toast.success("Usuario creado", { description: created.email });
      }
      resetForm();
    } catch (err) {
      toast.error(apiError(err, isEdit ? "Error al actualizar usuario" : "Error al crear usuario"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!tenant) return;
    setDeleting(userId);
    if (editingUser?.id === userId) resetForm();
    try {
      await saasService.deleteUser(tenant.id, userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      toast.success("Usuario eliminado");
    } catch {
      toast.error("Error al eliminar usuario");
    } finally {
      setDeleting(null);
    }
  };

  const canSave = isEdit
    ? username.trim().length > 0 && email.trim().length > 0 && (password === "" || password.length >= 8)
    : username.trim().length > 0 && email.trim().length > 0 && password.length >= 8;

  return (
    <Dialog open={!!tenant} onOpenChange={(v) => { if (!v) { onClose(); resetForm(); } }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-xl">{tenant?.logo}</span>
            {tenant?.name} · Usuarios
          </DialogTitle>
          <DialogDescription>Gestiona los usuarios de este restaurante.</DialogDescription>
        </DialogHeader>

        {/* User list */}
        <div className="max-h-44 overflow-y-auto rounded-lg border border-border">
          {loading ? (
            <div className="space-y-2 p-3">
              {[1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : users.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Sin usuarios creados</p>
          ) : (
            <Table>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className={editingUser?.id === u.id ? "bg-primary/5" : undefined}>
                    <TableCell className="font-medium">{u.username}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                    </TableCell>
                    <TableCell className="w-16">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(u)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          disabled={deleting === u.id}
                          onClick={() => handleDelete(u.id)}
                        >
                          {deleting === u.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Create / Edit form */}
        <div className="space-y-3 rounded-lg border border-dashed border-border p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">{isEdit ? `Editando: ${editingUser?.username}` : "Nuevo usuario"}</p>
            {isEdit && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={resetForm}>
                Cancelar edición
              </Button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Usuario</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ej: maria.gomez" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="maria@resto.co" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                Contraseña {isEdit && <span className="text-muted-foreground/60">(dejar vacío para no cambiar)</span>}
              </label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isEdit ? "Nueva contraseña (opcional)" : "mínimo 8 caracteres"}
                  className="pr-9"
                />
                <button type="button" onClick={() => setShowPass((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Rol</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button size="sm" className="w-full" disabled={!canSave || saving} onClick={handleSave}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : isEdit ? <Pencil className="mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { onClose(); resetForm(); }}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
