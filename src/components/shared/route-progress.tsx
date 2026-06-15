"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Barra de progreso de navegación (tab a tab).
 *
 * Detecta el inicio de la navegación interceptando clics en enlaces internos
 * y en el botón atrás/adelante del navegador, y la completa cuando cambia el
 * `pathname`. No depende de librerías externas (nprogress) ni de useSearchParams
 * para no forzar renderizado dinámico de toda la app.
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [width, setWidth] = useState(0);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeOut = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPath = useRef(pathname);

  const clearTimers = () => {
    if (trickle.current) clearInterval(trickle.current);
    if (fadeOut.current) clearTimeout(fadeOut.current);
  };

  const start = () => {
    clearTimers();
    setActive(true);
    setWidth(8);
    trickle.current = setInterval(() => {
      setWidth((w) => {
        if (w >= 90) return w;
        // Avanza más lento a medida que se acerca al 90%
        const step = w < 40 ? 9 : w < 70 ? 4 : 1.5;
        return Math.min(w + step, 90);
      });
    }, 220);
  };

  const finish = () => {
    clearTimers();
    setWidth(100);
    fadeOut.current = setTimeout(() => {
      setActive(false);
      setWidth(0);
    }, 380);
  };

  // Inicio: clics en enlaces internos
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (!href || !href.startsWith("/") || target === "_blank") return;
      // Mismo destino → no hay navegación que esperar
      if (href === pathname || href.split("?")[0] === pathname) return;
      start();
    };
    const onPopState = () => start();
    document.addEventListener("click", onClick);
    window.addEventListener("popstate", onPopState);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("popstate", onPopState);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Fin: el pathname cambió → completar
  useEffect(() => {
    if (pathname !== lastPath.current) {
      lastPath.current = pathname;
      finish();
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-0.5">
      <div
        className="h-full bg-gradient-to-r from-primary via-violet-500 to-primary shadow-[0_0_10px_hsl(var(--primary)/0.6)] transition-[width,opacity] duration-300 ease-out"
        style={{ width: `${width}%`, opacity: active ? 1 : 0 }}
      />
    </div>
  );
}
