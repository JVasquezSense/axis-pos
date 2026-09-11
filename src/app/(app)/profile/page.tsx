"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserCircle, KeyRound, Loader2, Save } from "lucide-react";
import { meService, type Me } from "@/services/me.service";
import { useAppStore } from "@/store/app.store";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PLAN_LABEL } from "@/lib/status";
import { ApiError } from "@/services/http";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador", cashier: "Cajero", waiter: "Mesero", kitchen: "Cocina", warehouse: "Almacén",
};

/**
 * Mi perfil: quién soy y dónde trabajo.
 *
 * El enlace de la barra superior solo mostraba un aviso. Nombre y correo son
 * lo mínimo que un usuario espera poder cambiar de sí mismo; la contraseña se
 * cambia aquí pidiendo la actual, para que un puesto que se quedó abierto no
 * baste para robar la cuenta.
 */
export default function ProfilePage() {
  const restaurant = useAppStore((s) => s.restaurant);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    meService.get()
      .then((data) => {
        setMe(data);
        setFirstName(data?.firstName ?? "");
        setLastName(data?.lastName ?? "");
        setEmail(data?.email ?? "");
      })
      .catch(() => setMe(null))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await meService.updateProfile({ firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() });
      toast.success("Perfil actualizado");
    } catch (err) {
      toast.error("No se pudo guardar", { description: err instanceof ApiError ? err.message.slice(0, 120) : undefined });
    } finally {
      setSaving(false);
    }
  };

  const passwordValid = current.length > 0 && next.length >= 8 && next === confirm;

  const changePassword = async () => {
    if (!passwordValid) return;
    setChanging(true);
    try {
      await meService.changePassword(current, next);
      setCurrent(""); setNext(""); setConfirm("");
      toast.success("Contraseña cambiada");
    } catch (err) {
      toast.error("No se pudo cambiar la contraseña", {
        description: err instanceof ApiError ? err.message.slice(0, 120) : undefined,
      });
    } finally {
      setChanging(false);
    }
  };

  const initials = ((firstName || me?.username || "?").slice(0, 1) + (lastName.slice(0, 1) || "")).toUpperCase();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Mi perfil"
        description="Tus datos de acceso y el restaurante en el que trabajas."
        icon={<UserCircle className="h-5 w-5" />}
      />

      {loading ? (
        <Skeleton className="h-64 w-full rounded-2xl" />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-2xl font-bold text-primary">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-semibold">{[firstName, lastName].filter(Boolean).join(" ") || me?.username}</p>
                <p className="truncate text-sm text-muted-foreground">{me?.username}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {me?.role && <Badge variant="secondary">{ROLE_LABEL[me.role] ?? me.role}</Badge>}
                  <Badge variant="outline">{restaurant.logo} {me?.tenantName ?? restaurant.name}</Badge>
                  {me?.tenantPlan && <Badge variant="outline">Plan {PLAN_LABEL[me.tenantPlan] ?? me.tenantPlan}</Badge>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Datos personales</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Nombre</label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Apellido</label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Tu apellido" />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Correo</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@restaurante.com" />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><KeyRound className="h-4 w-4" /> Cambiar contraseña</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Contraseña actual</label>
                <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Nueva contraseña</label>
                  <Input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Mínimo 8 caracteres" />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Repetir nueva contraseña</label>
                  <Input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
                  {confirm && next !== confirm && <p className="mt-1 text-xs text-destructive">No coinciden.</p>}
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" onClick={changePassword} disabled={!passwordValid || changing}>
                  {changing ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Cambiar contraseña
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
