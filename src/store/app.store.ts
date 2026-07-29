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

/** Features efectivas del plan del restaurante (secciones + capacidades). */
export type Features = Record<string, boolean | number>;

interface AppState {
  role: Role;
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  restaurant: Restaurant;
  /** null = aún no se resolvió el plan; no restringir todavía. */
  features: Features | null;
  maxUsers: number;
  setRole: (role: Role) => void;
  toggleSidebar: () => void;
  setSidebar: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
  updateRestaurant: (data: Partial<Restaurant>) => void;
  setFeatures: (features: Features | null, maxUsers?: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      role: "admin",
      sidebarCollapsed: false,
      commandOpen: false,
      restaurant: { name: "Demo Burger", slug: "demo-burger", plan: "Growth", logo: "🍔", banner: "" },
      features: null,
      maxUsers: 2,
      setRole: (role) => set({ role }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebar: (v) => set({ sidebarCollapsed: v }),
      setCommandOpen: (v) => set({ commandOpen: v }),
      updateRestaurant: (data) => set((s) => ({ restaurant: { ...s.restaurant, ...data } })),
      setFeatures: (features, maxUsers) =>
        set((s) => ({ features, maxUsers: maxUsers ?? s.maxUsers })),
    }),
    {
      name: "axis-app-store",
      partialize: (s) => ({ restaurant: s.restaurant, features: s.features, maxUsers: s.maxUsers }),
    }
  )
);
