"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

/** Protege las rutas del panel: si no hay sesión, redirige al inicio. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const loggedIn = useAuthStore((s) => s.loggedIn);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (mounted && !loggedIn) router.replace("/");
  }, [mounted, loggedIn, router]);

  if (!mounted || !loggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  return <>{children}</>;
}
