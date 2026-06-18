"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // En producción aquí se reporta a Sentry/observabilidad
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="h-8 w-8" />
      </div>
      <h1 className="text-xl font-semibold">Algo salió mal</h1>
      <p className="mt-1 max-w-sm text-muted-foreground">
        Ocurrió un error inesperado en esta sección. Puedes reintentar sin perder tu sesión.
      </p>
      <Button className="mt-6" onClick={reset}>
        <RotateCcw className="h-4 w-4" /> Reintentar
      </Button>
    </div>
  );
}
