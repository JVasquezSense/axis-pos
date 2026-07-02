/**
 * Capa HTTP.
 *
 * La demo usa `mockRequest` (datos simulados con latencia). Para conectar el
 * backend real de Django REST Framework basta con activar la bandera
 * NEXT_PUBLIC_USE_API y reemplazar `mockRequest(DATA)` por `request<T>(path)`
 * en cada *.service.ts — la firma y los tipos son idénticos, la UI no cambia.
 */
import { delay } from "@/lib/utils";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.axispos.co/v1";

/** Bandera para conmutar entre mocks y backend real sin tocar componentes. */
export const USE_API = process.env.NEXT_PUBLIC_USE_API === "true";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("axis-token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Limpia la sesión y manda al login cuando el refresh también falla. */
function clearSessionAndRedirect() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("axis-token");
  window.localStorage.removeItem("axis-refresh");
  window.localStorage.removeItem("axis-auth");
  window.localStorage.removeItem("axis-name");
  window.localStorage.removeItem("axis-superadmin");
  if (window.location.pathname !== "/") window.location.href = "/";
}

// Deduplica refresh concurrentes: si varias requests reciben 401 a la vez,
// solo se dispara una llamada a /auth/token/refresh/.
let refreshingPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refresh = window.localStorage.getItem("axis-refresh");
  if (!refresh) throw new ApiError(401, "No hay refresh token");
  const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  });
  if (!res.ok) {
    throw new ApiError(res.status, await res.text().catch(() => res.statusText));
  }
  const data = (await res.json()) as { access: string };
  window.localStorage.setItem("axis-token", data.access);
  return data.access;
}

/**
 * Petición real contra Django REST Framework.
 * Ej: request<DashboardData>("/dashboard/summary/")
 * Si el access token expiró (401), intenta refrescarlo una vez con el
 * refresh token antes de reintentar; si el refresh también falla, cierra sesión.
 */
export async function request<T>(path: string, init?: RequestInit, _retried = false): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });

  if (res.status === 401 && !_retried && typeof window !== "undefined") {
    try {
      if (!refreshingPromise) {
        refreshingPromise = refreshAccessToken().finally(() => {
          refreshingPromise = null;
        });
      }
      await refreshingPromise;
      return request<T>(path, init, true);
    } catch {
      clearSessionAndRedirect();
      throw new ApiError(401, "Sesión expirada, vuelve a iniciar sesión");
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, await res.text().catch(() => res.statusText));
  }
  return (await res.json()) as T;
}

/** Resuelve con datos mock simulando latencia de red variable. */
export async function mockRequest<T>(data: T, latency = 500): Promise<T> {
  await delay(latency + Math.random() * 300);
  // Clonado para emular una respuesta JSON fresca del servidor.
  return structuredClone(data);
}

/**
 * Handler de errores para mutaciones en stores.
 * Muestra un toast visible al usuario + loguea en consola.
 * Importar dinámicamente para evitar dependencia de React en la capa de servicios.
 */
export function apiErrorHandler(label: string) {
  return async (e: unknown) => {
    console.error(`[API:${label}]`, e);
    if (!USE_API) return;
    try {
      const { toast } = await import("sonner");
      const msg = e instanceof ApiError ? `${e.status}: ${e.message.slice(0, 80)}` : "Error de conexión";
      toast.error(`No se pudo guardar (${label})`, { description: msg });
    } catch { /* noop */ }
  };
}
