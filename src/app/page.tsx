"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck, Zap, Wifi } from "lucide-react";
import { LogoMark, LogoLockup } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth.store";
import { useAppStore } from "@/store/app.store";
import { USE_API, request } from "@/services/http";
import { cn } from "@/lib/utils";

function prettyName(email: string): string {
  const local = email.split("@")[0] || "Usuario";
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p[0].toUpperCase() + p.slice(1))
    .join(" ");
}

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const restaurant = useAppStore((s) => s.restaurant);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Ingresa tu correo y contraseña.");
      return;
    }
    setLoading(true);
    try {
      let isSuperAdmin = false;
      let tenantId: string | null = null;
      if (USE_API) {
        const data = await request<{ access: string; refresh: string }>("/auth/token/", {
          method: "POST",
          body: JSON.stringify({ username: email, password }),
        });
        window.localStorage.setItem("axis-token", data.access);
        window.localStorage.setItem("axis-refresh", data.refresh);
        try {
          const payload = JSON.parse(atob(data.access.split(".")[1]));
          isSuperAdmin = !!payload.is_superuser;
          tenantId = payload.tenant_id ?? null;
        } catch { /* token malformado, isSuperAdmin/tenantId quedan por defecto */ }
      } else {
        await new Promise((r) => setTimeout(r, 700));
      }
      login(prettyName(email), isSuperAdmin, tenantId);
      router.push("/dashboard");
    } catch {
      setError("Credenciales inválidas. Verifica tus datos.");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Panel de marca */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[hsl(220_28%_13%)] p-12 text-white lg:flex">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-primary/30 blur-[120px]" />
          <div className="absolute -right-24 top-10 h-80 w-80 rounded-full bg-gold/20 blur-[120px]" />
          <div className="absolute inset-0 [background:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:26px_26px]" />
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <LogoLockup size="lg" className="items-start" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative max-w-md">
          <h1 className="text-balance text-3xl font-bold leading-tight">
            El sistema operativo de tu restaurante.
          </h1>
          <p className="mt-3 text-white/70">
            POS, cocina, inventario, recetas, domicilios y tu página web — todo en una sola plataforma.
          </p>
          <div className="mt-8 space-y-3">
            {[
              { icon: Zap, text: "Operación en menos de 3 clics" },
              { icon: Wifi, text: "Cocina y pedidos en tiempo real" },
              { icon: ShieldCheck, text: "Multi-sucursal y multi-usuario" },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-sm text-white/85">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gold ring-1 ring-white/10">
                  <f.icon className="h-4 w-4" />
                </span>
                {f.text}
              </div>
            ))}
          </div>
        </motion.div>

        <p className="relative text-xs text-white/40">© 2026 Axis POS · Todos los derechos reservados</p>
      </div>

      {/* Panel de formulario */}
      <div className="relative flex items-center justify-center bg-background px-6 py-10">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-gold to-primary lg:hidden" />
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm"
        >
          {/* Logo compacto en móvil */}
          <div className="mb-8 flex flex-col items-center lg:hidden">
            <LogoLockup size="md" />
          </div>

          <div className="mb-6 hidden items-center gap-2.5 lg:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted ring-1 ring-border">
              <LogoMark className="h-6 w-6" />
            </div>
            <div>
              <p className="font-black tracking-[0.15em]">AXIS</p>
              <p className="-mt-0.5 text-[9px] font-semibold tracking-[0.3em] text-gold">POS SYSTEM</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight">Inicia sesión</h2>
          <p className="mt-1 text-sm text-muted-foreground">Bienvenido de vuelta. Ingresa a tu cuenta.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Correo electrónico</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="tu@restaurante.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium">Contraseña</label>
                <button type="button" className="text-xs text-muted-foreground hover:text-foreground">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="px-9"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Ingresando…
                </>
              ) : (
                <>
                  Ingresar <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>{USE_API ? "Conectado al servidor" : "v1.0 · Axis POS"}</span>
            <Link href={`/restaurant/${restaurant.slug}`} className="font-medium text-primary hover:underline">
              Ver carta del restaurante →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
