"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Users, Search, UserPlus, Star } from "lucide-react";
import type { Customer } from "@/types";
import { crmService } from "@/services/crm.service";
import { useAsync } from "@/hooks/use-async";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CustomerDetail } from "@/components/crm/customer-detail";
import { LOYALTY } from "@/lib/status";
import { cn, formatCurrency, initials } from "@/lib/utils";

export default function CrmPage() {
  const { data, loading } = useAsync(() => crmService.getCustomers());
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Customer | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () =>
      (data ?? []).filter((c) =>
        query ? c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query) : true
      ),
    [data, query]
  );

  const totals = useMemo(() => {
    const items = data ?? [];
    return {
      count: items.length,
      vip: items.filter((c) => c.tier === "platinum" || c.tier === "gold").length,
      revenue: items.reduce((s, c) => s + c.totalSpent, 0),
    };
  }, [data]);

  const select = (c: Customer) => {
    setSelected(c);
    setOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes · CRM"
        description="Fidelización y relación con tus comensales"
        icon={<Users className="h-5 w-5" />}
        actions={
          <Button size="sm">
            <UserPlus className="h-4 w-4" /> Nuevo cliente
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Clientes registrados</p>
          <p className="text-2xl font-bold">{loading ? "—" : totals.count}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Clientes VIP (Oro / Platino)</p>
          <p className="text-2xl font-bold text-violet-500">{loading ? "—" : totals.vip}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Ingresos atribuidos</p>
          <p className="text-2xl font-bold text-emerald-500">{loading ? "—" : formatCurrency(totals.revenue)}</p>
        </Card>
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
          : filtered.map((c, i) => {
              const tier = LOYALTY[c.tier];
              return (
                <motion.button
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => select(c)}
                  className="flex flex-col rounded-xl border border-border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>{initials(c.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </div>
                    <Badge className={cn(tier.className)}>
                      <Star className="h-3 w-3" /> {tier.label}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <div>
                      <p className="text-[11px] text-muted-foreground">Total gastado</p>
                      <p className="font-semibold">{formatCurrency(c.totalSpent)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">Última visita</p>
                      <p className="font-medium">{c.lastVisit}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
      </div>

      <CustomerDetail customer={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
