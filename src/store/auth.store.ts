import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Sesión simulada para la demo. En producción se reemplaza por JWT/cookies
 * contra el endpoint de autenticación de Django (token + refresh).
 */
interface AuthState {
  loggedIn: boolean;
  name: string;
  login: (name?: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      loggedIn: false,
      name: "Juan Vásquez",
      login: (name) => set({ loggedIn: true, ...(name ? { name } : {}) }),
      logout: () => set({ loggedIn: false }),
    }),
    { name: "axis-auth", version: 1 }
  )
);
