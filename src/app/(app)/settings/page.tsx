"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Settings, Save, Loader2, ImagePlus, X, Receipt, Layers, UserCog, Globe, ChevronRight } from "lucide-react";
import { meService, type TenantSettings } from "@/services/me.service";
import { ApiError } from "@/services/http";
import { useAppStore } from "@/store/app.store";
import { useFeatures } from "@/lib/features";
import { shrinkImageFile } from "@/lib/image";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

function isImageUrl(src: string) {
  return src.startsWith("data:") || src.startsWith("http") || src.startsWith("/");
}

/**
 * Configuración del restaurante.
 *
 * El enlace de la barra superior llevaba a /admin, la pantalla del
 * superadmin, que un restaurante no puede abrir. Aquí vive lo suyo: cómo se
 * llama, cómo se ve y dónde está, más los accesos a lo que ya se configura en
 * otros módulos (impuestos, zonas del salón, equipo).
 */
export default function SettingsPage() {
  const role = useAppStore((s) => s.role);
  const updateRestaurant = useAppStore((s) => s.updateRestaurant);
  const { has } = useFeatures();
  const isAdmin = role === "admin";

  const [data, setData] = useState<TenantSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", logo: "🍽️", city: "", address: "", phone: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    meService.getSettings()
      .then((s) => {
        setData(s);
        setForm({ name: s.name, logo: s.logo || "🍽️", city: s.city, address: s.address, phone: s.phone });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    set({ logo: await shrinkImageFile(file, { maxSide: 400, quality: 0.8 }) });
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("El nombre no puede quedar vacío");
      return;
    }
    setSaving(true);
    try {
      const saved = await meService.updateSettings({
        name: form.name.trim(), logo: form.logo, city: form.city.trim(),
        address: form.address.trim(), phone: form.phone.trim(),
      });
      setData(saved);
      // La barra lateral y el ticket leen el nombre y el logo de aquí.
      updateRestaurant({ name: saved.name, logo: saved.logo });
      toast.success("Configuración guardada");
    } catch (err) {
      toast.error("No se pudo guardar", { description: err instanceof ApiError ? err.message.slice(0, 120) : undefined });
    } finally {
      setSaving(false);
    }
  };

  const shortcuts = [
    { href: "/menu", label: "Impuestos", desc: "Los que cobra el restaurante, en la carta", icon: Receipt, show: true },
    { href: "/salon", label: "Zonas del salón", desc: "Nombre y alto de cada zona del mapa", icon: Layers, show: has("salon") },
    { href: "/employees", label: "Equipo", desc: "Usuarios, roles y accesos", icon: UserCog, show: has("employees") },
    { href: "/website", label: "Página web", desc: "Carta pública y pedidos en línea", icon: Globe, show: has("website") },
  ].filter((s) => s.show);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Configuración"
        description="Identidad del restaurante y accesos a lo que se ajusta en cada módulo."
        icon={<Settings className="h-5 w-5" />}
      />

      {loading ? (
        <Skeleton className="h-72 w-full rounded-2xl" />
      ) : (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Restaurante</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!isAdmin && (
                <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Solo el administrador puede cambiar estos datos.
                </p>
              )}
              <div className="flex flex-col gap-4 sm:flex-row">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Logo</label>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                  <div className="relative h-20 w-20">
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => fileRef.current?.click()}
                      className="h-20 w-20 overflow-hidden rounded-2xl border border-border bg-muted transition-colors hover:border-primary disabled:cursor-not-allowed"
                      title="Subir logo"
                    >
                      {isImageUrl(form.logo) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={form.logo} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-1">
                          <span className="text-3xl leading-none">{form.logo || "🍽️"}</span>
                          <ImagePlus className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                    </button>
                    {isImageUrl(form.logo) && isAdmin && (
                      <button
                        type="button"
                        onClick={() => set({ logo: "🍽️" })}
                        className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                  {!isImageUrl(form.logo) && (
                    <input
                      value={form.logo}
                      disabled={!isAdmin}
                      onChange={(e) => set({ logo: e.target.value.slice(0, 2) })}
                      className="mt-1 h-7 w-20 rounded border border-border bg-muted text-center text-xs outline-none focus:border-primary"
                      placeholder="emoji"
                    />
                  )}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Nombre</label>
                    <Input value={form.name} disabled={!isAdmin} onChange={(e) => set({ name: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Ciudad</label>
                      <Input value={form.city} disabled={!isAdmin} onChange={(e) => set({ city: e.target.value })} placeholder="Bogotá" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Teléfono</label>
                      <Input value={form.phone} disabled={!isAdmin} onChange={(e) => set({ phone: e.target.value })} placeholder="300 000 0000" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Dirección</label>
                    <Input value={form.address} disabled={!isAdmin} onChange={(e) => set({ address: e.target.value })} placeholder="Calle 10 # 20-30" />
                  </div>
                </div>
              </div>
              {data && (
                <p className="text-xs text-muted-foreground">
                  Carta pública: <span className="font-mono">/restaurant/{data.slug}</span>
                </p>
              )}
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={save} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Se configura en su módulo</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {shortcuts.map((s) => (
                <Link
                  key={s.href}
                  href={s.href}
                  className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-muted"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <s.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{s.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{s.desc}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
