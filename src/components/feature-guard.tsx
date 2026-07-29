"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { useFeatures } from "@/lib/features";
import { useAppStore } from "@/store/app.store";
import { Button } from "@/components/ui/button";

/**
 * Bloquea el acceso directo por URL a un módulo que el plan del restaurante no
 * incluye. La barra lateral ya lo oculta; esto cubre a quien escribe la ruta.
 * El backend además devuelve vacío/403, así que no hay fuga de datos.
 */
export function FeatureGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { has } = useFeatures();
  const plan = useAppStore((s) => s.restaurant.plan);

  // Ruta -> sección del menú (la más específica que haga prefijo).
  const item = NAV_ITEMS
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!item || item.key === "admin" || has(item.key)) return <>{children}</>;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Lock className="h-6 w-6" />
      </div>
      <p className="text-lg font-bold">{item.label} no está en tu plan</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        Tu restaurante tiene el plan <strong className="text-foreground">{plan}</strong>. Pide al
        administrador de la plataforma que lo habilite o cambie de plan.
      </p>
      <Button asChild className="mt-5">
        <Link href="/dashboard">Volver al panel</Link>
      </Button>
    </div>
  );
}
