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

/** Hook: `const { has, features, maxUsers } = useFeatures()`. */
export function useFeatures() {
  const features = useAppStore((s) => s.features);
  const maxUsers = useAppStore((s) => s.maxUsers);
  return {
    features,
    maxUsers,
    has: (key: string) => isFeatureEnabled(features, key),
  };
}
