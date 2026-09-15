"use client";

import { useEffect, useState } from "react";

/** true cuando la pantalla cumple la media query; false en el servidor. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

/** Teléfono: por debajo del breakpoint `md` de Tailwind. */
export function useIsPhone(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
