"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Layers, Loader2, Users } from "lucide-react";
import { saasService, type PlanConfig } from "@/services/saas.service";
import { SECTION_FEATURES, CAPABILITY_FEATURES, PLAN_LABEL } from "@/lib/plan-features";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * Editor de los 3 planes SaaS: qué secciones y capacidades incluye cada uno,
 * cuántos usuarios permite y su precio. Lo que se guarde aquí rige para todos
 * los restaurantes de ese plan (salvo overrides puntuales por restaurante).
 */
export function PlansDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [plans, setPlans] = useState<PlanConfig[] | null>(null);
  const [active, setActive] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPlans(null);
    saasService.getPlans()
      .then(setPlans)
      .catch(() => { setPlans([]); toast.error("No se pudieron cargar los planes"); });
  }, [open]);

  const plan = plans?.[active];

  const setFeature = (id: string, value: boolean) => {
    if (!plans || !plan) return;
    const next = [...plans];
    next[active] = { ...plan, features: { ...plan.features, [id]: value } };
    setPlans(next);
  };

  const setField = (patch: Partial<PlanConfig>) => {
    if (!plans || !plan) return;
    const next = [...plans];
    next[active] = { ...plan, ...patch };
    setPlans(next);
  };

  const save = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const saved = await saasService.savePlan(plan);
      setPlans((prev) => (prev ? prev.map((p, i) => (i === active ? saved : p)) : prev));
      toast.success(`Plan ${saved.name} guardado`, {
        description: `${saved.maxUsers} usuarios · ${formatCurrency(saved.price)}/mes`,
      });
    } catch (err) {
      toast.error("No se pudo guardar el plan", {
        description: err instanceof Error ? err.message.slice(0, 120) : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const Group = ({ title, items }: { title: string; items: typeof SECTION_FEATURES }) => (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {items.map((f) => {
          const on = f.core ? true : plan?.features?.[f.id] === true;
          return (
            <div
              key={f.id}
              className={cn(
                "flex items-center justify-between gap-2 rounded-lg border px-3 py-2",
                f.core ? "border-dashed border-border bg-muted/30" : "border-border"
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{f.label}</p>
                <p className="truncate text-[11px] text-muted-foreground">{f.desc}</p>
              </div>
              {f.core ? (
                <Badge variant="secondary" className="shrink-0">Núcleo</Badge>
              ) : (
                <Switch checked={on} onCheckedChange={(v) => setFeature(f.id, v)} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-4 w-4" /> Planes y funcionalidades
          </DialogTitle>
        </DialogHeader>

        {!plans ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : plans.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hay planes configurados.</p>
        ) : (
          <div className="space-y-4">
            {/* Selector de plan */}
            <div className="flex gap-2">
              {plans.map((p, i) => (
                <button
                  key={p.code}
                  onClick={() => setActive(i)}
                  className={cn(
                    "flex-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    i === active ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                  )}
                >
                  <p className="text-sm font-semibold">{p.name || PLAN_LABEL[p.code] || p.code}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.maxUsers} usuarios · {formatCurrency(p.price)}
                  </p>
                </button>
              ))}
            </div>

            {plan && (
              <>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Nombre</label>
                    <Input value={plan.name} onChange={(e) => setField({ name: e.target.value })} />
                  </div>
                  <div>
                    <label className="mb-1.5 flex items-center gap-1 text-sm font-medium">
                      <Users className="h-3.5 w-3.5" /> Usuarios máx.
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={plan.maxUsers}
                      onChange={(e) => setField({ maxUsers: Math.max(Number(e.target.value) || 1, 1) })}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Precio / mes (COP)</label>
                    <Input
                      type="number"
                      min={0}
                      value={plan.price}
                      onChange={(e) => setField({ price: Math.max(Number(e.target.value) || 0, 0) })}
                    />
                  </div>
                </div>

                <Group title="Secciones del menú" items={SECTION_FEATURES} />
                <Group title="Capacidades" items={CAPABILITY_FEATURES} />

                <div className="flex justify-end gap-2 border-t border-border pt-3">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
                  <Button onClick={save} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />} Guardar plan
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
