import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="h-8 w-8" />
      </div>
      <p className="text-5xl font-black tracking-tight">404</p>
      <h1 className="mt-2 text-xl font-semibold">Página no encontrada</h1>
      <p className="mt-1 max-w-sm text-muted-foreground">
        La ruta que buscas no existe o fue movida. Vuelve al panel para continuar.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-colors hover:bg-primary/90"
      >
        <Home className="h-4 w-4" /> Ir al panel
      </Link>
    </div>
  );
}
