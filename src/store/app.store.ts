import { create } from "zustand";
import type { Role } from "@/types";

interface AppState {
  role: Role;
  sidebarCollapsed: boolean;
  commandOpen: boolean;
  restaurant: { name: string; slug: string; plan: string; logo: string };
  setRole: (role: Role) => void;
  toggleSidebar: () => void;
  setSidebar: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
}

export const useAppStore = create<AppState>()((set) => ({
  role: "admin",
  sidebarCollapsed: false,
  commandOpen: false,
  restaurant: { name: "Demo Burger", slug: "demo-burger", plan: "Growth", logo: "🍔" },
  setRole: (role) => set({ role }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebar: (v) => set({ sidebarCollapsed: v }),
  setCommandOpen: (v) => set({ commandOpen: v }),
}));
