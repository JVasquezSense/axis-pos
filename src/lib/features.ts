import { NAV_ITEMS } from "@/lib/nav";
import { useAppStore } from "@/store/app.store";

/**
 * Secciones del menú lateral que NO dependen del plan: sin ellas el
 * restaurante no puede operar. Coinciden con CORE_FEATURES del backend.
 */
export const CORE_SECTIONS = ["dashboard", "salon", "orders", "kitchen", "checkout"];

/**
 * ¿Está habilitada esta sección/capacidad para el restaurante?
 *
 * Mientras el plan no se haya resuelto (features === null) se responde `true`
 * para no esconder el menú en el primer render; el backend igual bloquea los
 * módulos que el plan no incluye.
 */
export function isFeatureEnabled(
  features: Record<string, boolean | number> | null,
  key: string
): boolean {
  if (CORE_SECTIONS.includes(key)) return true;
  if (!features) return true;
  if (!(key in features)) return true; // clave desconocida: no restringir
  return features[key] === true;
}

/** Sección del menú a la que pertenece una ruta (la coincidencia más específica). */
export function navItemForPath(path: string) {
  return NAV_ITEMS
    .filter((i) => path === i.href || path.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/** Hook: `const { has, hasPath, features, maxUsers } = useFeatures()`. */
export function useFeatures() {
  const features = useAppStore((s) => s.features);
  const maxUsers = useAppStore((s) => s.maxUsers);
  const has = (key: string) => isFeatureEnabled(features, key);
  return {
    features,
    maxUsers,
    has,
    /** Igual que `has` pero para un href: útil en accesos rápidos y atajos. */
    hasPath: (path: string) => {
      const item = navItemForPath(path);
      return !item || has(item.key);
    },
  };
}
