import { create } from "zustand";
import { USE_API } from "@/services/http";

interface AuthState {
  loggedIn: boolean;
  name: string;
  isSuperAdmin: boolean;
  tenantId: string | null;
  login: (name?: string, isSuperAdmin?: boolean, tenantId?: string | null) => void;
  logout: () => void;
}

function readToken(): boolean {
  if (typeof window === "undefined") return false;
  if (USE_API) return !!window.localStorage.getItem("axis-token");
  try {
    const raw = window.localStorage.getItem("axis-auth");
    return !!raw && !!JSON.parse(raw)?.state?.loggedIn;
  } catch {
    return false;
  }
}

function readName(): string {
  if (typeof window === "undefined") return "Usuario";
  return window.localStorage.getItem("axis-name") || "Usuario";
}

function readIsSuperAdmin(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("axis-superadmin") === "1";
}

function readTenantId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("axis-tenant-id");
}

/**
 * Borra los caches de datos por-tenant. Debe ejecutarse al iniciar o cerrar
 * sesión para que un usuario nunca vea datos cacheados de otro restaurante en
 * el mismo navegador (los stores volverán a hidratarse desde el backend).
 */
function clearDataCaches() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("axis-menu");
  window.localStorage.removeItem("axis-recipes");
  window.localStorage.removeItem("axis-inventory");
  window.localStorage.removeItem("axis-sync-pending");
}

export const useAuthStore = create<AuthState>()((set) => ({
  loggedIn: readToken(),
  name: readName(),
  isSuperAdmin: readIsSuperAdmin(),
  tenantId: readTenantId(),

  login: (name, isSuperAdmin = false, tenantId = null) => {
    const display = name ?? "Usuario";
    if (typeof window !== "undefined") {
      // Si cambia el tenant respecto a la sesión previa, purgar caches para no
      // arrastrar datos de otro restaurante.
      const prevTenant = window.localStorage.getItem("axis-tenant-id");
      if (prevTenant !== (tenantId ?? null)) clearDataCaches();
      window.localStorage.setItem("axis-name", display);
      window.localStorage.setItem("axis-superadmin", isSuperAdmin ? "1" : "0");
      if (tenantId) window.localStorage.setItem("axis-tenant-id", tenantId);
      else window.localStorage.removeItem("axis-tenant-id");
    }
    set({ loggedIn: true, name: display, isSuperAdmin, tenantId });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("axis-token");
      window.localStorage.removeItem("axis-refresh");
      window.localStorage.removeItem("axis-name");
      window.localStorage.removeItem("axis-superadmin");
      window.localStorage.removeItem("axis-tenant-id");
      clearDataCaches();
    }
    set({ loggedIn: false, name: "Usuario", isSuperAdmin: false, tenantId: null });
  },
}));
