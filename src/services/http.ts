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

/**
 * Petición real contra Django REST Framework.
 * Ej: request<DashboardData>("/dashboard/summary/")
 */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
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
