"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { NAV_ITEMS } from "@/lib/nav";
import { ROLE_NAV } from "@/lib/roles";
import { buildOnboardingSteps } from "@/lib/onboarding";
import { useAppStore } from "@/store/app.store";
import { useAuthStore } from "@/store/auth.store";
import { useOnboardingStore } from "@/store/onboarding.store";

/** Mide el rect del item de sidebar resaltado; se recalcula al cambiar de paso o al redimensionar. */
function useTargetRect(navKey: string | undefined) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!navKey) {
      setRect(null);
      return;
    }
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${navKey}"]`);
      // Un sidebar oculto (mobile) sigue en el DOM pero con rect 0x0: se trata igual que "no encontrado".
      const box = el?.getBoundingClientRect();
      setRect(box && box.width > 0 && box.height > 0 ? box : null);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [navKey]);

  return rect;
}

export function OnboardingTour() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const role = useAppStore((s) => s.role);
  const active = useOnboardingStore((s) => s.active);
  const step = useOnboardingStore((s) => s.step);
  const skip = useOnboardingStore((s) => s.skip);
  const finish = useOnboardingStore((s) => s.finish);
  const next = useOnboardingStore((s) => s.next);
  const prev = useOnboardingStore((s) => s.prev);

  useEffect(() => {
    useOnboardingStore.getState().maybeStart();
  }, []);

  const navKeys = useMemo(() => {
    const allowed = ROLE_NAV[role] ?? ROLE_NAV.admin;
    return NAV_ITEMS.filter((i) => allowed.includes(i.key) && (i.key !== "admin" || isSuperAdmin)).map((i) => i.key);
  }, [role, isSuperAdmin]);

  const steps = useMemo(() => buildOnboardingSteps(navKeys), [navKeys]);
  const current = steps[step];
  const isFirst = step === 0;
  const isLast = step === steps.length - 1;

  const targetRect = useTargetRect(active && current?.type === "spotlight" ? current.navKey : undefined);

  if (!active || !current) return null;

  const handleNext = () => (isLast ? finish() : next(steps.length));

  // Sin target medible (paso intro/outro, o spotlight en mobile sin sidebar visible): card centrada.
  if (current.type !== "spotlight" || !targetRect) {
    return (
      <Dialog open onOpenChange={(v) => !v && skip()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            {current.type === "intro" && (
              <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Compass className="h-6 w-6" />
              </div>
            )}
            {current.type === "spotlight" && (
              <p className="text-xs font-semibold text-primary">Paso {step} de {steps.length - 2}</p>
            )}
            <DialogTitle>{current.title}</DialogTitle>
            <DialogDescription>{current.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="items-center sm:justify-between">
            {current.type === "intro" && (
              <>
                <Button variant="ghost" onClick={skip}>Saltar por ahora</Button>
                <Button onClick={handleNext}>Empezar recorrido</Button>
              </>
            )}
            {current.type === "spotlight" && (
              <>
                <Button variant="ghost" onClick={skip}>Saltar tour</Button>
                <div className="flex gap-2">
                  {!isFirst && <Button variant="outline" onClick={prev}>Atrás</Button>}
                  <Button onClick={handleNext}>{isLast ? "Listo" : "Siguiente"}</Button>
                </div>
              </>
            )}
            {current.type === "outro" && (
              <>
                <Button variant="ghost" onClick={skip}>Cerrar</Button>
                <Button onClick={handleNext}>Empezar a usar Axis POS</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const pad = 3;
  const tooltipWidth = 320;
  const tooltipLeft = Math.min(targetRect.right + 16, window.innerWidth - tooltipWidth - 16);
  const tooltipTop = Math.min(Math.max(targetRect.top, 16), window.innerHeight - 240);

  return (
    <>
      {/* Bloquea la interacción con el resto de la app mientras dura el recorrido. */}
      <div className="fixed inset-0 z-[95]" />
      <motion.div
        layout
        transition={{ duration: 0.25 }}
        className="pointer-events-none fixed z-[96] rounded-xl ring-2 ring-primary shadow-[0_0_0_9999px_rgba(2,6,23,0.72)]"
        style={{
          top: targetRect.top - pad,
          left: targetRect.left - pad,
          width: targetRect.width + pad * 2,
          height: targetRect.height + pad * 2,
        }}
      />
      <motion.div
        layout
        transition={{ duration: 0.25 }}
        className="fixed z-[97] w-80 rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl"
        style={{ top: tooltipTop, left: tooltipLeft }}
      >
        <p className="mb-1.5 text-xs font-semibold text-primary">
          Paso {step} de {steps.length - 2}
        </p>
        <h3 className="mb-1 text-base font-bold">{current.title}</h3>
        <p className="mb-4 text-sm text-muted-foreground">{current.description}</p>
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={skip}>Saltar tour</Button>
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={prev}>Atrás</Button>
            )}
            <Button size="sm" onClick={handleNext}>{isLast ? "Listo" : "Siguiente"}</Button>
          </div>
        </div>
      </motion.div>
    </>
  );
}
