"use client";

/**
 * Hook legado — la carga de stores ahora la hace DataProvider
 * con lógica cache-first en cada store.load().
 */
export function useAppInit() {
  // noop: DataProvider.load() handles hydration with localStorage cache
}
