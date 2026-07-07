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

export const useAuthStore = create<AuthState>()((set) => ({
  loggedIn: readToken(),
  name: readName(),
  isSuperAdmin: readIsSuperAdmin(),
  tenantId: readTenantId(),

  login: (name, isSuperAdmin = false, tenantId = null) => {
    const display = name ?? "Usuario";
    if (typeof window !== "undefined") {
      window.localStorage.setItem("axis-name", display);
      window.localStorage.setItem("axis-superadmin", isSuperAdmin ? "1" : "0");
      if (tenantId) window.localStorage.setItem("axis-tenant-id", tenantId);
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
    }
    set({ loggedIn: false, name: "Usuario", isSuperAdmin: false, tenantId: null });
  },
}));
