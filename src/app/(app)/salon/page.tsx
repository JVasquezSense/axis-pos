"use client";

import { useState } from "react";
import { Armchair, Plus } from "lucide-react";
import type { RestaurantTable, TableStatus } from "@/types";
import { salonService } from "@/services/salon.service";
import { useAsync } from "@/hooks/use-async";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TableMap } from "@/components/salon/table-map";
import { TableDrawer } from "@/components/salon/table-drawer";
import { TABLE_STATUS } from "@/lib/status";
import { cn } from "@/lib/utils";

export default function SalonPage() {
  const { data, loading } = useAsync(() => salonService.getTables());
  const [selected, setSelected] = useState<RestaurantTable | null>(null);
  const [open, setOpen] = useState(false);

  const select = (t: RestaurantTable) => {
    setSelected(t);
    setOpen(true);
  };

  const counts = (data ?? []).reduce(
    (acc, t) => {
      acc[t.status] = (acc[t.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<TableStatus, number>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Salón"
        description="Mapa interactivo · 12 mesas · 3 zonas"
        icon={<Armchair className="h-5 w-5" />}
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nueva mesa
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(TABLE_STATUS) as TableStatus[]).map((s) => (
          <Card key={s} className="flex items-center gap-3 p-4">
            <span className={cn("h-3 w-3 rounded-full", TABLE_STATUS[s].dot)} />
            <div>
              <p className="text-xl font-bold">{counts[s] ?? 0}</p>
              <p className="text-xs text-muted-foreground">{TABLE_STATUS[s].label}</p>
            </div>
          </Card>
        ))}
      </div>

      {loading || !data ? (
        <Skeleton className="h-[560px] w-full rounded-2xl" />
      ) : (
        <TableMap tables={data} onSelect={select} />
      )}

      <TableDrawer table={selected} open={open} onOpenChange={setOpen} />
    </div>
  );
}
