"use client";

import { useState } from "react";
import { ClipboardCheck, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  useAuditStore,
  type AuditModule,
  MODULE_LABELS,
  MODULE_COLORS,
} from "@/store/audit.store";

const MODULES: AuditModule[] = [
  "ventas", "inventario", "menu", "proveedores",
  "reservaciones", "mesas", "empleados", "sistema",
];

function formatTs(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("es-CO", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function AuditPage() {
  const { entries, clear } = useAuditStore();
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<AuditModule | "all">("all");
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = entries.filter((e) => {
    const matchSearch =
      e.action.toLowerCase().includes(search.toLowerCase()) ||
      e.details.toLowerCase().includes(search.toLowerCase()) ||
      e.user.toLowerCase().includes(search.toLowerCase());
    const matchModule = moduleFilter === "all" || e.module === moduleFilter;
    return matchSearch && matchModule;
  });

  const handleClear = () => {
    clear();
    setConfirmClear(false);
    toast.success("Historial de auditoría borrado");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Auditoría"
        description={`${entries.length} acciones registradas`}
        icon={<ClipboardCheck className="h-5 w-5" />}
        actions={
          entries.length > 0 ? (
            <Button size="sm" variant="outline" onClick={() => setConfirmClear(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" /> Limpiar historial
            </Button>
          ) : undefined
        }
      />

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar acción, detalle o usuario…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={moduleFilter} onValueChange={(v) => setModuleFilter(v as AuditModule | "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Módulo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los módulos</SelectItem>
            {MODULES.map((m) => (
              <SelectItem key={m} value={m}>{MODULE_LABELS[m]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ClipboardCheck className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {entries.length === 0
                ? "No hay acciones registradas aún. Las acciones del sistema aparecerán aquí automáticamente."
                : "Sin resultados para ese filtro."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card p-3"
            >
              <Badge
                variant="outline"
                className={`mt-0.5 shrink-0 text-xs ${MODULE_COLORS[entry.module]}`}
              >
                {MODULE_LABELS[entry.module]}
              </Badge>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-snug">{entry.action}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatTs(entry.ts)}</span>
                </div>
                {entry.details && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{entry.details}</p>
                )}
                <p className="mt-1 text-xs font-medium text-foreground/60">Por: {entry.user}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={confirmClear} onOpenChange={setConfirmClear}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Limpiar historial de auditoría</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Se eliminarán todos los {entries.length} registros de auditoría. Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClear(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleClear}>Limpiar todo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
