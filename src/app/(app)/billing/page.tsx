"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileText, Save, Loader2, CreditCard, Users, Check, Minus } from "lucide-react";
import { meService, type TenantSettings } from "@/services/me.service";
import { ApiError } from "@/services/http";
import { useAppStore } from "@/store/app.store";
import { SECTION_FEATURES, CAPABILITY_FEATURES, PLAN_LABEL } from "@/lib/plan-features";
import { TENANT_STATUS } from "@/lib/status";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatCurrency } from "@/lib/utils";

/**
 * Facturación: lo que sale impreso en cada factura y lo que el restaurante
 * paga por el sistema.
 *
 * Los datos fiscales existían en el modelo (NIT, razón social, resolución
 * DIAN, prefijo) pero no había pantalla para escribirlos: el ticket salía sin
 * ellos. El plan se muestra tal cual lo definió el superadmin; cambiarlo es
 * una conversación, no un botón.
 */
export default function BillingPage() {
  const role = useAppStore((s) => s.role);
  const isAdmin = role === "admin";

  const [data, setData] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ taxId: "", legalName: "", resolution: "", invoicePrefix: "FV" });

  useEffect(() => {
    meService.getSettings()
      .then((s) => {
        setData(s);
        setForm({ taxId: s.taxId, legalName: s.legalName, resolution: s.resolution, invoicePrefix: s.invoicePrefix || "FV" });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    const prefix = form.invoicePrefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 12) || "FV";
    setSaving(true);
    try {
      const saved = await meService.updateSettings({
        taxId: form.taxId.trim(), legalName: form.legalName.trim(),
        resolution: form.resolution.trim(), invoicePrefix: prefix,
      });
      setData(saved);
      setForm((f) => ({ ...f, invoicePrefix: saved.invoicePrefix }));
      toast.success("Datos de facturación guardados");
    } catch (err) {
      toast.error("No se pudo guardar", { description: err instanceof ApiError ? err.message.slice(0, 120) : undefined });
    } finally {
      setSaving(false);
    }
  };

  const nextInvoice = data ? `${form.invoicePrefix || "FV"}-${String((data.invoiceSeq ?? 0) + 1).padStart(6, "0")}` : "";
  const status = data ? TENANT_STATUS[data.status as keyof typeof TENANT_STATUS] : undefined;
  const on = (key: string) => data?.features?.[key] === true;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Facturación"
        description="Datos fiscales de tus facturas y el plan que tienes contratado."
        icon={<FileText className="h-5 w-5" />}
      />

      {loading ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Datos fiscales de la factura</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!isAdmin && (
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Solo el administrador puede cambiar estos datos.
                </p>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">NIT / RUT</label>
                  <Input value={form.taxId} disabled={!isAdmin} onChange={(e) => set({ taxId: e.target.value })} placeholder="900.123.456-7" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Razón social</label>
                  <Input value={form.legalName} disabled={!isAdmin} onChange={(e) => set({ legalName: e.target.value })} placeholder="Mi Restaurante S.A.S." />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Resolución DIAN</label>
                <Input value={form.resolution} disabled={!isAdmin} onChange={(e) => set({ resolution: e.target.value })} placeholder="Res. 18760000001234 de 2026 · del FV-1 al FV-50000" />
                <p className="mt-1 text-xs text-muted-foreground">Se imprime al pie de cada factura tal como la escribas.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Prefijo de factura</label>
                  <Input value={form.invoicePrefix} disabled={!isAdmin} onChange={(e) => set({ invoicePrefix: e.target.value.toUpperCase() })} placeholder="FV" maxLength={12} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Próxima factura</label>
                  <div className="flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 font-mono text-sm">{nextInvoice}</div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Consecutivo automático: {data?.invoiceSeq ?? 0} emitida{(data?.invoiceSeq ?? 0) === 1 ? "" : "s"} hasta hoy.
                  </p>
                </div>
              </div>
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4" /> Tu plan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-lg font-bold">{data.planName || PLAN_LABEL[data.plan] || data.plan}</p>
                    <p className="text-sm text-muted-foreground">
                      {data.planPrice > 0 ? `${formatCurrency(data.planPrice)} / mes` : "Sin cargo mensual definido"}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {status && <Badge variant={status.variant}>{status.label}</Badge>}
                    <Badge variant="outline" className="gap-1">
                      <Users className="h-3 w-3" /> {data.users}/{data.maxUsers} usuarios
                    </Badge>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Incluye</p>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {[...SECTION_FEATURES, ...CAPABILITY_FEATURES].map((f) => {
                      const active = f.core || on(f.id);
                      return (
                        <div key={f.id} className={cn("flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm", active ? "" : "text-muted-foreground/60")}>
                          {active ? <Check className="h-4 w-4 shrink-0 text-emerald-500" /> : <Minus className="h-4 w-4 shrink-0" />}
                          <span className={cn(!active && "line-through")}>{f.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Para cambiar de plan o ampliar usuarios, escríbenos: el cambio lo aplica el equipo de Axis y queda activo al instante.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
