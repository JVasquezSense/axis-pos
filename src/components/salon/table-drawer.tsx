"use client";

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
} from "lucide-react";
import type { RestaurantTable } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { TABLE_STATUS } from "@/lib/status";
import { formatCurrency, formatElapsed, initials, minutesAgo } from "@/lib/utils";
import { useOrderStore } from "@/store/order.store";

export function TableDrawer({
  table,
  open,
  onOpenChange,
}: {
  table: RestaurantTable | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const setTable = useOrderStore((s) => s.setTable);
  if (!table) return null;
  const status = TABLE_STATUS[table.status];
  const elapsed = table.seatedAt ? minutesAgo(new Date(table.seatedAt)) : 0;

  const takeOrder = () => {
    setTable(table.number);
    onOpenChange(false);
    router.push("/orders");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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

        <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-6">
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
              <Action icon={<Move className="h-4 w-4" />} label="Mover mesa" onClick={() => toast.info("Selecciona la mesa destino")} />
              <Action icon={<Merge className="h-4 w-4" />} label="Unir mesa" onClick={() => toast.info("Modo unión activado")} />
              <Action icon={<SplitSquareHorizontal className="h-4 w-4" />} label="Dividir cuenta" onClick={() => toast.info("Dividir cuenta en 2")} />
              <Action icon={<ClipboardList className="h-4 w-4" />} label="Ver pedido" onClick={takeOrder} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-border p-4">
          <Button variant="outline" onClick={takeOrder}>
            <ClipboardList className="h-4 w-4" /> Tomar pedido
          </Button>
          <Button
            onClick={() => {
              onOpenChange(false);
              router.push("/checkout");
            }}
          >
            <CreditCard className="h-4 w-4" /> Cobrar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
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
      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {icon}
      {label}
    </button>
  );
}
