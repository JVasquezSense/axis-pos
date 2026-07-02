import { create } from "zustand";
import { USE_API } from "@/services/http";

interface AuthState {
  loggedIn: boolean;
  name: string;
  isSuperAdmin: boolean;
  login: (name?: string, isSuperAdmin?: boolean) => void;
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

export const useAuthStore = create<AuthState>()((set) => ({
  loggedIn: readToken(),
  name: readName(),
  isSuperAdmin: readIsSuperAdmin(),

  login: (name, isSuperAdmin = false) => {
    const display = name ?? "Usuario";
    if (typeof window !== "undefined") {
      window.localStorage.setItem("axis-name", display);
      window.localStorage.setItem("axis-superadmin", isSuperAdmin ? "1" : "0");
    }
    set({ loggedIn: true, name: display, isSuperAdmin });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("axis-token");
      window.localStorage.removeItem("axis-refresh");
      window.localStorage.removeItem("axis-name");
      window.localStorage.removeItem("axis-superadmin");
    }
    set({ loggedIn: false, name: "Usuario", isSuperAdmin: false });
  },
}));
