"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarClock, Plus, Search, Phone, Users, Clock, Pencil, Trash2, CheckCheck, UserCheck } from "lucide-react";
import { useReservationsStore, STATUS_CONFIG, type Reservation, type ReservationStatus } from "@/store/reservations.store";
import { useTablesStore } from "@/store/tables.store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MoreVertical } from "lucide-react";

const TODAY = new Date().toISOString().split("T")[0];

function emptyReservation(): Omit<Reservation, "id"> {
  return { name: "", phone: "", tableNumber: 1, date: TODAY, time: "12:00", guests: 2, notes: "", status: "pending" };
}

export default function ReservationsPage() {
  const { reservations, add, update, remove, setStatus } = useReservationsStore();
  const tables = useTablesStore((s) => s.tables);
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ReservationStatus | "all">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [toDelete, setToDelete] = useState<Reservation | null>(null);

  const filtered = useMemo(
    () =>
      reservations.filter(
        (r) =>
          (filterStatus === "all" || r.status === filterStatus) &&
          (query === "" ||
            r.name.toLowerCase().includes(query.toLowerCase()) ||
            r.phone.includes(query))
      ),
    [reservations, filterStatus, query]
  );

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, Reservation[]>();
    filtered.forEach((r) => {
      const list = map.get(r.date) ?? [];
      list.push(r);
      map.set(r.date, list);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (r: Reservation) => { setEditing(r); setFormOpen(true); };

  const save = (data: Omit<Reservation, "id"> & { id?: string }) => {
    if (data.id) {
      update(data as Reservation);
      toast.success("Reservación actualizada");
    } else {
      add(data);
      toast.success("Reservación creada", { description: `${data.name} · ${data.date} ${data.time}` });
    }
    setFormOpen(false);
  };

  const countByStatus = useMemo(() => {
    const m: Record<string, number> = {};
    reservations.forEach((r) => { m[r.status] = (m[r.status] ?? 0) + 1; });
    return m;
  }, [reservations]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reservaciones"
        description="Gestiona las reservas de mesas con hora y fecha"
        icon={<CalendarClock className="h-5 w-5" />}
        actions={
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4" /> Nueva reserva
          </Button>
        }
      />

      {/* Status chips */}
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "confirmed", "arrived", "cancelled"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              filterStatus === s ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"
            )}
          >
            {s === "all" ? "Todas" : STATUS_CONFIG[s].label}
            <span className={cn("rounded-full px-1.5 text-xs", filterStatus === s ? "bg-primary-foreground/20" : "bg-muted-foreground/15")}>
              {s === "all" ? reservations.length : (countByStatus[s] ?? 0)}
            </span>
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Buscar por nombre o teléfono…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {grouped.length === 0 ? (
        <Card className="py-16 text-center">
          <CardContent>
            <CalendarClock className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="font-medium">Sin reservaciones</p>
            <p className="text-sm text-muted-foreground">Crea la primera reserva con el botón de arriba.</p>
            <Button className="mt-4" onClick={openNew}><Plus className="h-4 w-4" /> Nueva reserva</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(([date, list]) => (
            <div key={date}>
              <div className="mb-3 flex items-center gap-3">
                <span className="text-sm font-semibold">
                  {date === TODAY ? "Hoy" : new Date(date + "T00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
                </span>
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">{list.length} reservas</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list
                  .sort((a, b) => a.time.localeCompare(b.time))
                  .map((r) => (
                    <Card key={r.id} className={cn("overflow-hidden", r.status === "cancelled" && "opacity-60")}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-semibold">{r.name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {r.time}</span>
                              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {r.guests} pax</span>
                              <span className="flex items-center gap-1">Mesa {r.tableNumber}</span>
                            </div>
                            {r.phone && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="h-3 w-3" /> {r.phone}
                              </p>
                            )}
                            {r.notes && <p className="mt-1.5 text-xs italic text-muted-foreground line-clamp-1">{r.notes}</p>}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm"><MoreVertical className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {r.status !== "confirmed" && r.status !== "cancelled" && (
                                <DropdownMenuItem onClick={() => { setStatus(r.id, "confirmed"); toast.success("Reserva confirmada"); }}>
                                  <CheckCheck className="h-4 w-4" /> Confirmar
                                </DropdownMenuItem>
                              )}
                              {r.status !== "arrived" && r.status !== "cancelled" && (
                                <DropdownMenuItem onClick={() => { setStatus(r.id, "arrived"); toast.success("Cliente llegó"); }}>
                                  <UserCheck className="h-4 w-4" /> Marcar llegada
                                </DropdownMenuItem>
                              )}
                              {r.status !== "cancelled" && (
                                <DropdownMenuItem onClick={() => { setStatus(r.id, "cancelled"); toast.info("Reserva cancelada"); }}>
                                  Cancelar reserva
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => openEdit(r)}><Pencil className="h-4 w-4" /> Editar</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setToDelete(r)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="mt-3">
                          <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_CONFIG[r.status].color)}>
                            {STATUS_CONFIG[r.status].label}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ReservationFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        tables={tables.map((t) => t.number)}
        onSave={save}
      />

      <Dialog open={!!toDelete} onOpenChange={(v) => !v && setToDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar reservación</DialogTitle>
            <DialogDescription>¿Eliminar la reserva de <strong>{toDelete?.name}</strong>? No se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { if (toDelete) { remove(toDelete.id); toast.success("Reservación eliminada"); } setToDelete(null); }}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReservationFormDialog({
  open, onOpenChange, initial, tables, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Reservation | null;
  tables: number[];
  onSave: (data: Omit<Reservation, "id"> & { id?: string }) => void;
}) {
  const base = initial ?? emptyReservation();
  const [form, setForm] = useState(base);
  const set = (k: keyof typeof form, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => { setForm(initial ?? emptyReservation()); }, [initial, open]);

  const valid = form.name.trim().length > 0 && form.tableNumber > 0 && form.date && form.time;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar reservación" : "Nueva reservación"}</DialogTitle>
          <DialogDescription>Asigna mesa, fecha y hora al cliente.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Nombre del cliente *</label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Juan García" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Teléfono</label>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="300 000 0000" type="tel" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Personas *</label>
            <Input value={form.guests} onChange={(e) => set("guests", Number(e.target.value))} type="number" min={1} max={20} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Fecha *</label>
            <Input value={form.date} onChange={(e) => set("date", e.target.value)} type="date" min={TODAY} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Hora *</label>
            <Input value={form.time} onChange={(e) => set("time", e.target.value)} type="time" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Mesa *</label>
            <Select value={String(form.tableNumber)} onValueChange={(v) => set("tableNumber", Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(tables.length > 0 ? tables : [1, 2, 3, 4, 5, 6, 7, 8]).map((n) => (
                  <SelectItem key={n} value={String(n)}>Mesa {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Estado</label>
            <Select value={form.status} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(STATUS_CONFIG) as [ReservationStatus, { label: string }][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <label className="mb-1.5 block text-sm font-medium">Notas</label>
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Cumpleaños, alergia, preferencia…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => onSave(initial ? { ...form, id: initial.id } : form)} disabled={!valid}>
            {initial ? "Guardar cambios" : "Crear reservación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
