"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, UserCog, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useEmployeesStore,
  type Employee,
  type EmployeeRole,
  EMPLOYEE_ROLE_LABELS,
  EMPLOYEE_ROLE_COLORS,
} from "@/store/employees.store";

const ROLES: EmployeeRole[] = ["mesero", "cocinero", "cajero", "admin", "almacen"];

function emptyEmployee(): Omit<Employee, "id"> {
  return { name: "", role: "mesero", active: true, phone: "", email: "" };
}

export default function EmployeesPage() {
  const { employees, add, update, remove, toggle } = useEmployeesStore();
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<Omit<Employee, "id">>(emptyEmployee());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<EmployeeRole | "all">("all");

  const filtered = employees.filter((e) => {
    const matchSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.phone.includes(search) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || e.role === roleFilter;
    return matchSearch && matchRole;
  });

  const openNew = () => {
    setEditing(null);
    setForm(emptyEmployee());
    setOpen(true);
  };

  const openEdit = (e: Employee) => {
    setEditing(e);
    setForm({ name: e.name, role: e.role, active: e.active, phone: e.phone, email: e.email });
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) return toast.error("El nombre es requerido");
    if (editing) {
      update({ ...editing, ...form });
      toast.success("Empleado actualizado");
    } else {
      add(form);
      toast.success("Empleado agregado");
    }
    setOpen(false);
  };

  const handleDelete = () => {
    if (!deleteId) return;
    remove(deleteId);
    setDeleteId(null);
    toast.success("Empleado eliminado");
  };

  const activeCount = employees.filter((e) => e.active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Empleados"
        description={`${employees.length} registrados · ${activeCount} activos`}
        icon={<UserCog className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="mr-1.5 h-4 w-4" /> Agregar empleado
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Buscar por nombre, teléfono o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as EmployeeRole | "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Rol" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los roles</SelectItem>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>{EMPLOYEE_ROLE_LABELS[r]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <UserCog className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {employees.length === 0 ? "Agrega tu primer empleado." : "Sin resultados para esa búsqueda."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((emp) => (
            <Card key={emp.id} className={emp.active ? "" : "opacity-60"}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{emp.name}</p>
                    <Badge
                      variant="outline"
                      className={`mt-1 text-xs ${EMPLOYEE_ROLE_COLORS[emp.role]}`}
                    >
                      {EMPLOYEE_ROLE_LABELS[emp.role]}
                    </Badge>
                  </div>
                  <Badge variant={emp.active ? "default" : "secondary"} className="shrink-0 text-xs">
                    {emp.active ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
                {emp.phone && (
                  <p className="mt-2 text-xs text-muted-foreground">📞 {emp.phone}</p>
                )}
                {emp.email && (
                  <p className="text-xs text-muted-foreground">✉ {emp.email}</p>
                )}
                <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => toggle(emp.id)}
                  >
                    {emp.active ? (
                      <><ToggleRight className="mr-1 h-3.5 w-3.5 text-emerald-500" /> Desactivar</>
                    ) : (
                      <><ToggleLeft className="mr-1 h-3.5 w-3.5" /> Activar</>
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => openEdit(emp)}>
                    <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-7 px-2 text-xs text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(emp.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar empleado" : "Agregar empleado"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nombre completo *</label>
              <Input
                placeholder="Ej. Carlos Rodríguez"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Rol *</label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v as EmployeeRole }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{EMPLOYEE_ROLE_LABELS[r]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Teléfono</label>
              <Input
                placeholder="300 000 0000"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="empleado@email.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editing ? "Guardar cambios" : "Agregar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar empleado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta acción no se puede deshacer. El empleado será eliminado permanentemente.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
