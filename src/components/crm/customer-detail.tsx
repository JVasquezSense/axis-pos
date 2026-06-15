"use client";

import { Phone, Mail, Star, Ticket, Receipt, TrendingUp } from "lucide-react";
import type { Customer } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LOYALTY } from "@/lib/status";
import { cn, formatCurrency, initials } from "@/lib/utils";

export function CustomerDetail({
  customer,
  open,
  onOpenChange,
}: {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!customer) return null;
  const tier = LOYALTY[customer.tier];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col gap-0 p-0">
        <SheetHeader className="border-b border-border">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14 text-base">
              <AvatarFallback>{initials(customer.name)}</AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle>{customer.name}</SheetTitle>
              <Badge className={cn("mt-1", tier.className)}>
                <Star className="h-3 w-3" /> {tier.label}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        <div className="scrollbar-thin flex-1 space-y-5 overflow-y-auto p-6">
          <div className="grid grid-cols-3 gap-3">
            <Metric icon={<Receipt className="h-4 w-4" />} label="Visitas" value={`${customer.visits}`} />
            <Metric icon={<TrendingUp className="h-4 w-4" />} label="Gastado" value={formatCurrency(customer.totalSpent)} />
            <Metric icon={<Star className="h-4 w-4" />} label="Puntos" value={`${customer.points}`} />
          </div>

          <div className="space-y-2 rounded-xl border border-border p-4">
            <p className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" /> {customer.phone}
            </p>
            <p className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" /> {customer.email}
            </p>
            <p className="text-xs text-muted-foreground">Última visita: {customer.lastVisit}</p>
          </div>

          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
              <Ticket className="h-4 w-4" /> Cupones activos
            </p>
            {customer.coupons.length ? (
              <div className="space-y-2">
                {customer.coupons.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="text-xs text-muted-foreground">Vence {c.expires}</p>
                    </div>
                    <span className="text-lg font-bold text-primary">{c.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                Sin cupones disponibles
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Historial de compras</p>
            <div className="space-y-2">
              {customer.history.map((h, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <div>
                    <p className="text-sm font-medium">{h.code}</p>
                    <p className="text-xs text-muted-foreground">{h.date} · {h.items} productos</p>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(h.total)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3 text-center">
      <div className="mx-auto mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <p className="truncate text-sm font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
