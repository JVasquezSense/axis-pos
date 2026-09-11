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
  /** Vista activa. */
  role: Role;
  /** Roles que el servidor le asignó al usuario; null = sin resolver (todos). */
  userRoles: Role[] | null;
  /** Nombre de pila del usuario, para saludarlo. */
  userName: string;
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  restaurant: Restaurant;
  /** null = aún no se resolvió el plan; no restringir todavía. */
  features: Features | null;
  maxUsers: number;
  setRole: (role: Role) => void;
  /** Fija los roles del usuario y deja como vista activa uno de ellos. */
  setUserRoles: (roles: Role[] | null) => void;
  setUserName: (name: string) => void;
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
      userRoles: null,
      userName: "",
      sidebarCollapsed: false,
      commandOpen: false,
      restaurant: { name: "Demo Burger", slug: "demo-burger", plan: "Growth", logo: "🍔", banner: "" },
      features: null,
      maxUsers: 2,
      setRole: (role) => set({ role }),
      setUserName: (userName) => set({ userName }),
      setUserRoles: (roles) =>
        set((s) => {
          if (!roles || roles.length === 0) return { userRoles: null };
          // La vista activa tiene que ser uno de los roles propios: un mesero
          // no puede quedarse en la vista de administrador.
          const role = roles.includes(s.role) ? s.role : roles[0];
          return { userRoles: roles, role };
        }),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebar: (v) => set({ sidebarCollapsed: v }),
      setCommandOpen: (v) => set({ commandOpen: v }),
      updateRestaurant: (data) => set((s) => ({ restaurant: { ...s.restaurant, ...data } })),
      setFeatures: (features, maxUsers) =>
        set((s) => ({ features, maxUsers: maxUsers ?? s.maxUsers })),
    }),
    {
      name: "axis-app-store",
      partialize: (s) => ({ restaurant: s.restaurant, features: s.features, maxUsers: s.maxUsers, role: s.role, userRoles: s.userRoles, userName: s.userName }),
    }
  )
);
