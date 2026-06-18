"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Clock,
  Users,
  User,
  MapPin,
  ClipboardList,
  Move,
  Merge,
  SplitSquareHorizontal,
  CreditCard,
  ArrowLeft,
  Minus,
  Plus,
  Check,
} from "lucide-react";
import type { RestaurantTable } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TABLE_STATUS } from "@/lib/status";
import { cn, formatCurrency, formatElapsed, initials, minutesAgo } from "@/lib/utils";
import { useOrderStore } from "@/store/order.store";

type Mode = "idle" | "move" | "merge" | "split";

export function TableDrawer({
  table,
  open,
  onOpenChange,
  tables = [],
  onMove,
  onMerge,
}: {
  table: RestaurantTable | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tables?: RestaurantTable[];
  onMove?: (sourceId: string, targetId: string) => void;
  onMerge?: (sourceId: string, targetId: string) => void;
}) {
  const router = useRouter();
  const setTable = useOrderStore((s) => s.setTable);
  const [mode, setMode] = useState<Mode>("idle");
  const [people, setPeople] = useState(2);

  const close = (v: boolean) => {
    if (!v) setMode("idle");
    onOpenChange(v);
  };

  if (!table) return null;
  const status = TABLE_STATUS[table.status];
  const elapsed = table.seatedAt ? minutesAgo(new Date(table.seatedAt)) : 0;

  const takeOrder = () => {
    setTable(table.number);
    close(false);
    router.push("/orders");
  };

  const goCheckout = () => {
    setTable(table.number);
    close(false);
    router.push("/checkout");
  };

  const moveTargets = tables.filter((t) => t.id !== table.id && t.status === "available");
  const mergeTargets = tables.filter((t) => t.id !== table.id && t.status !== "reserved");
  const perPerson = table.orderTotal ? Math.ceil(table.orderTotal / people) : 0;

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-black text-primary">
              {table.number}
            </div>
            <div className="flex-1">
              <SheetTitle>Mesa {table.number}</SheetTitle>
              <div className="mt-1 flex items-center gap-2">
                <Badge variant="outline" className={status.text}>
                  <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} /> {status.label}
                </Badge>
                <span className="text-xs text-muted-foreground">{table.zone}</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-6">
          {mode === "idle" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <Stat icon={<Users className="h-4 w-4" />} label="Capacidad" value={`${table.capacity} personas`} />
                <Stat icon={<User className="h-4 w-4" />} label="Comensales" value={table.guests ? `${table.guests}` : "—"} />
                <Stat icon={<Clock className="h-4 w-4" />} label="Tiempo" value={table.seatedAt ? formatElapsed(elapsed) : "—"} />
                <Stat icon={<MapPin className="h-4 w-4" />} label="Zona" value={table.zone} />
              </div>

              {table.waiter && (
                <div className="flex items-center gap-3 rounded-xl border border-border p-3">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{initials(table.waiter)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Mesero asignado</p>
                    <p className="text-sm font-medium">{table.waiter}</p>
                  </div>
                </div>
              )}

              {table.orderTotal ? (
                <div>
                  <p className="mb-2 text-sm font-semibold">Pedido actual</p>
                  <div className="rounded-xl border border-border">
                    <div className="flex items-center justify-between p-3 text-sm">
                      <span className="text-muted-foreground">3 productos · sin enviar a caja</span>
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between p-3">
                      <span className="text-sm font-medium">Total parcial</span>
                      <span className="text-lg font-bold">{formatCurrency(table.orderTotal)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  Esta mesa aún no tiene pedido.
                </div>
              )}

              <div>
                <p className="mb-2 text-sm font-semibold">Acciones rápidas</p>
                <div className="grid grid-cols-2 gap-2">
                  <Action icon={<Move className="h-4 w-4" />} label="Mover mesa" onClick={() => setMode("move")} />
                  <Action icon={<Merge className="h-4 w-4" />} label="Unir mesa" onClick={() => setMode("merge")} />
                  <Action
                    icon={<SplitSquareHorizontal className="h-4 w-4" />}
                    label="Dividir cuenta"
                    onClick={() => {
                      if (!table.orderTotal) {
                        toast.info("La mesa no tiene un pedido para dividir");
                        return;
                      }
                      setMode("split");
                    }}
                  />
                  <Action icon={<ClipboardList className="h-4 w-4" />} label="Ver pedido" onClick={takeOrder} />
                </div>
              </div>
            </div>
          )}

          {/* MOVER */}
          {mode === "move" && (
            <ModePanel title="Mover mesa" onBack={() => setMode("idle")} hint={`Selecciona la mesa destino para los comensales de la mesa ${table.number}.`}>
              {moveTargets.length === 0 ? (
                <Empty text="No hay mesas disponibles para mover." />
              ) : (
                moveTargets.map((t) => (
                  <TargetRow
                    key={t.id}
                    table={t}
                    onClick={() => {
                      onMove?.(table.id, t.id);
                      toast.success(`Mesa ${table.number} movida a la mesa ${t.number}`);
                      close(false);
                    }}
                  />
                ))
              )}
            </ModePanel>
          )}

          {/* UNIR */}
          {mode === "merge" && (
            <ModePanel title="Unir mesa" onBack={() => setMode("idle")} hint={`Une otra mesa con la ${table.number}. Se sumarán comensales y consumo.`}>
              {mergeTargets.length === 0 ? (
                <Empty text="No hay mesas para unir." />
              ) : (
                mergeTargets.map((t) => (
                  <TargetRow
                    key={t.id}
                    table={t}
                    onClick={() => {
                      onMerge?.(table.id, t.id);
                      toast.success(`Mesa ${t.number} unida a la mesa ${table.number}`);
                      close(false);
                    }}
                  />
                ))
              )}
            </ModePanel>
          )}

          {/* DIVIDIR */}
          {mode === "split" && (
            <ModePanel title="Dividir cuenta" onBack={() => setMode("idle")} hint="Divide el total entre los comensales.">
              <div className="rounded-xl border border-border p-4 text-center">
                <p className="text-xs text-muted-foreground">Total de la cuenta</p>
                <p className="text-2xl font-bold">{formatCurrency(table.orderTotal ?? 0)}</p>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-border p-4">
                <span className="text-sm font-medium">Personas</span>
                <div className="flex items-center gap-1 rounded-lg border border-border">
                  <button onClick={() => setPeople((p) => Math.max(2, p - 1))} className="flex h-8 w-8 items-center justify-center rounded-l-lg hover:bg-muted">
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-sm font-bold">{people}</span>
                  <button onClick={() => setPeople((p) => Math.min(12, p + 1))} className="flex h-8 w-8 items-center justify-center rounded-r-lg hover:bg-muted">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-center">
                <p className="text-xs text-muted-foreground">Cada persona paga</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(perPerson)}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{people} pagos de {formatCurrency(perPerson)}</p>
              </div>
              <Button className="w-full" onClick={goCheckout}>
                <CreditCard className="h-4 w-4" /> Cobrar dividido
              </Button>
            </ModePanel>
          )}
        </div>

        {mode === "idle" && (
          <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
            <Button variant="outline" onClick={takeOrder}>
              <ClipboardList className="h-4 w-4" /> Tomar pedido
            </Button>
            <Button onClick={goCheckout}>
              <CreditCard className="h-4 w-4" /> Cobrar
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function ModePanel({ title, hint, onBack, children }: { title: string; hint: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="font-semibold">{title}</p>
      </div>
      <p className="text-sm text-muted-foreground">{hint}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function TargetRow({ table, onClick }: { table: RestaurantTable; onClick: () => void }) {
  const status = TABLE_STATUS[table.status];
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-bold">{table.number}</div>
      <div className="flex-1">
        <p className="text-sm font-medium">Mesa {table.number}</p>
        <p className="text-xs text-muted-foreground">{table.zone} · {table.capacity} personas</p>
      </div>
      <Badge variant="outline" className={status.text}>{status.label}</Badge>
      <Check className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">{text}</p>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}

function Action({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
