import { create } from "zustand";
import { USE_API } from "@/services/http";

interface AuthState {
  loggedIn: boolean;
  name: string;
  login: (name?: string) => void;
  logout: () => void;
}

function readToken(): boolean {
  if (typeof window === "undefined") return false;
  if (USE_API) return !!window.localStorage.getItem("axis-token");
  // Demo mode: lee flag simple
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

export const useAuthStore = create<AuthState>()((set) => ({
  loggedIn: readToken(),
  name: readName(),

  login: (name) => {
    const display = name ?? "Usuario";
    if (typeof window !== "undefined") window.localStorage.setItem("axis-name", display);
    set({ loggedIn: true, name: display });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("axis-token");
      window.localStorage.removeItem("axis-name");
    }
    set({ loggedIn: false, name: "Usuario" });
  },
}));
