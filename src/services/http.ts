/**
 * Capa HTTP simulada.
 *
 * En producción, `request` se reemplaza por una llamada real (fetch/axios)
 * contra la API de Django REST Framework. Toda la app consume datos a través
 * de los *.service.ts, nunca directamente desde los componentes, por lo que
 * el cambio a backend real no toca la capa de UI.
 *
 * Ejemplo de implementación real:
 *
 *   export async function request<T>(path: string, init?: RequestInit) {
 *     const res = await fetch(`${API_URL}${path}`, {
 *       ...init,
 *       headers: { "Content-Type": "application/json", ...authHeader() },
 *     });
 *     if (!res.ok) throw new ApiError(res.status, await res.text());
 *     return (await res.json()) as T;
 *   }
 */
import { delay } from "@/lib/utils";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.axispos.co/v1";

/** Resuelve con datos mock simulando latencia de red variable. */
export async function mockRequest<T>(data: T, latency = 500): Promise<T> {
  await delay(latency + Math.random() * 300);
  // Clonado para emular una respuesta JSON fresca del servidor.
  return structuredClone(data);
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}
