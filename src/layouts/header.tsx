"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, AlertTriangle, ChefHat, Globe, CheckCheck, Compass } from "lucide-react";
import { MobileNav } from "./mobile-nav";
import { GlobalSearch } from "@/components/shared/global-search";
import { RoleSwitcher } from "@/components/shared/role-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInventoryStore } from "@/store/inventory.store";
import { useKitchenStore } from "@/store/kitchen.store";
import { useWebStore } from "@/store/web.store";
import { useAuthStore } from "@/store/auth.store";
import { useOnboardingStore } from "@/store/onboarding.store";
import { initials, minutesAgo } from "@/lib/utils";

interface Notif {
  icon: React.ElementType;
  tone: string;
  title: string;
  desc: string;
  href: string;
}

export function Header() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Seleccionamos arrays crudos (referencia estable) y filtramos en el cuerpo,
  // para no devolver un array nuevo en cada render (evita bucle de renders).
  const items = useInventoryStore((s) => s.items);
  const tickets = useKitchenStore((s) => s.tickets);
  const liveOrders = useWebStore((s) => s.liveOrders);
  const userName = useAuthStore((s) => s.name);
  const logout = useAuthStore((s) => s.logout);

  const critical = items.filter((i) => i.status === "critical");
  const webReview = liveOrders.filter((o) => o.status === "review");
  const lateTickets = tickets.filter((t) => t.status !== "ready" && minutesAgo(new Date(t.createdAt)) >= 15);

  const allNotifs: Notif[] = [
    ...critical.map((i) => ({
      icon: AlertTriangle,
      tone: "text-destructive bg-destructive/10",
      title: `${i.name} en nivel crítico`,
      desc: `Quedan ${i.stock} ${i.unit} · reponer`,
      href: "/inventory",
    })),
    ...lateTickets.map((t) => ({
      icon: ChefHat,
      tone: "text-amber-500 bg-amber-500/10",
      title: `${t.code}${t.table ? ` · Mesa ${t.table}` : ""} demorada`,
      desc: `${minutesAgo(new Date(t.createdAt))} min en cocina`,
      href: "/kitchen",
    })),
    ...webReview.map((o) => ({
      icon: Globe,
      tone: "text-primary bg-primary/10",
      title: `Pedido web ${o.code} por verificar`,
      desc: `${o.customer} · comprobante subido`,
      href: "/website",
    })),
  ];
  const notifs = mounted ? allNotifs : [];

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
      <MobileNav />

      <GlobalSearch />

      <div className="flex flex-1 items-center justify-end gap-1.5 md:flex-none">
        <RoleSwitcher />
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {notifs.length > 0 && (
                <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground ring-2 ring-background">
                  {notifs.length}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notificaciones
              {notifs.length > 0 && <span className="text-xs font-normal text-muted-foreground">{notifs.length} activas</span>}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-1.5 px-4 py-6 text-center text-muted-foreground">
                <CheckCheck className="h-7 w-7" />
                <p className="text-sm">Todo al día</p>
              </div>
            ) : (
              notifs.slice(0, 6).map((n, i) => (
                <DropdownMenuItem key={i} onClick={() => router.push(n.href)} className="flex items-start gap-2.5 py-2.5">
                  <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${n.tone}`}>
                    <n.icon className="h-4 w-4" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium leading-tight">{n.title}</span>
                    <span className="text-xs text-muted-foreground">{n.desc}</span>
                  </span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-9 w-9">
                <AvatarFallback>{initials(userName)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2.5 py-2">
              <p className="text-sm font-semibold">{userName}</p>
              <p className="text-xs text-muted-foreground">Propietario · Demo Burger</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => toast.info("Perfil de usuario")}>Mi perfil</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin")}>Configuración</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin")}>Facturación</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { router.push("/dashboard"); useOnboardingStore.getState().start(); }}>
              <Compass className="h-4 w-4" />
              Ver recorrido guiado
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => {
                logout();
                router.push("/");
              }}
            >
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
