"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Store, Globe } from "lucide-react";
import { ROLE_LIST } from "@/lib/roles";
import { useAppStore } from "@/store/app.store";
import { useAuthStore } from "@/store/auth.store";
import { Icon } from "@/components/shared/icon";
import { cn } from "@/lib/utils";

const ROLE_ICON: Record<string, string> = {
  admin: "ShieldCheck",
  waiter: "Armchair",
  cashier: "CreditCard",
  kitchen: "ChefHat",
};

const ROLE_STYLE: Record<string, string> = {
  violet: "from-violet-500/15 to-violet-500/5 text-violet-500 ring-violet-500/20",
  emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-500 ring-emerald-500/20",
  sky: "from-sky-500/15 to-sky-500/5 text-sky-500 ring-sky-500/20",
  amber: "from-amber-500/15 to-amber-500/5 text-amber-500 ring-amber-500/20",
};

export default function LandingPage() {
  const router = useRouter();
  const setRole = useAppStore((s) => s.setRole);
  const login = useAuthStore((s) => s.login);

  const enter = (roleId: string, route: string) => {
    setRole(roleId as never);
    login();
    router.push(route);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Fondo decorativo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -right-40 top-20 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px]" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-sky-500/10 blur-[120px]" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Demo interactiva · Multi-tenant SaaS
          </div>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl font-black text-primary-foreground shadow-xl">
              A
            </div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Axis POS</h1>
          </div>
          <p className="max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            El sistema operativo todo-en-uno para restaurantes. POS, cocina, inventario, CRM,
            domicilios y tu página web — sincronizados en tiempo real.
          </p>
        </motion.div>

        <div className="mt-12 w-full">
          <p className="mb-4 text-center text-sm font-medium text-muted-foreground">
            Selecciona un rol para iniciar el recorrido
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_LIST.map((role, i) => (
              <motion.button
                key={role.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
                onClick={() => enter(role.id, role.defaultRoute)}
                className="group relative flex flex-col items-start rounded-2xl border border-border bg-card p-5 text-left shadow-sm ring-1 ring-transparent transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div
                  className={cn(
                    "mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ring-1",
                    ROLE_STYLE[role.color]
                  )}
                >
                  <Icon name={ROLE_ICON[role.id]} className="h-6 w-6" />
                </div>
                <p className="font-semibold">{role.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{role.description}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                  Entrar <ArrowRight className="h-4 w-4" />
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            href="/dashboard"
            onClick={() => login()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 hover:shadow-lg"
          >
            <Store className="h-4 w-4" /> Ir al panel completo
          </Link>
          <Link
            href="/restaurant/demo-burger"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold shadow-sm transition-colors hover:bg-accent"
          >
            <Globe className="h-4 w-4" /> Ver página web del cliente
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
