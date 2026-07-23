import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/types";

export interface Restaurant {
  name: string;
  slug: string;
  plan: string;
  logo: string;
  banner: string;
  /** Datos fiscales para el ticket (backlog #1). Opcionales: vienen del Tenant. */
  taxId?: string;
  legalName?: string;
  address?: string;
  phone?: string;
  resolution?: string;
}

interface AppState {
  role: Role;
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  restaurant: Restaurant;
  setRole: (role: Role) => void;
  toggleSidebar: () => void;
  setSidebar: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
  updateRestaurant: (data: Partial<Restaurant>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      role: "admin",
      sidebarCollapsed: false,
      commandOpen: false,
      restaurant: { name: "Demo Burger", slug: "demo-burger", plan: "Growth", logo: "🍔", banner: "" },
      setRole: (role) => set({ role }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebar: (v) => set({ sidebarCollapsed: v }),
      setCommandOpen: (v) => set({ commandOpen: v }),
      updateRestaurant: (data) => set((s) => ({ restaurant: { ...s.restaurant, ...data } })),
    }),
    {
      name: "axis-app-store",
      partialize: (s) => ({ restaurant: s.restaurant }),
    }
  )
);
