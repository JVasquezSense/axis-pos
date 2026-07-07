import type { Role, RoleConfig } from "@/types";

export const ROLES: Record<Role, RoleConfig> = {
  admin: {
    id: "admin",
    label: "Administrador",
    description: "Acceso total a la operación y métricas del negocio",
    color: "violet",
    defaultRoute: "/dashboard",
  },
  waiter: {
    id: "waiter",
    label: "Mesero",
    description: "Gestión del salón, mesas y toma de pedidos",
    color: "emerald",
    defaultRoute: "/dashboard",
  },
  cashier: {
    id: "cashier",
    label: "Cajero",
    description: "Cobros, facturación y cierre de caja",
    color: "sky",
    defaultRoute: "/dashboard",
  },
  kitchen: {
    id: "kitchen",
    label: "Cocina",
    description: "Tablero KDS y preparación de órdenes",
    color: "amber",
    defaultRoute: "/dashboard",
  },
  warehouse: {
    id: "warehouse",
    label: "Almacén",
    description: "Inventario, proveedores y compras",
    color: "cyan",
    defaultRoute: "/inventory",
  },
};

export const ROLE_LIST = Object.values(ROLES);

/** Rutas visibles por rol en la navegación */
export const ROLE_NAV: Record<Role, string[]> = {
  admin: [
    "dashboard", "salon", "reservations", "orders", "kitchen",
    "checkout", "shift", "history", "shift-history", "menu", "inventory", "suppliers",
    "employees", "audit", "crm", "reports", "weborders", "website", "admin",
  ],
  waiter: ["dashboard", "salon", "reservations", "orders", "kitchen"],
  cashier: ["dashboard", "checkout", "shift", "history", "shift-history", "salon", "weborders", "crm", "employees"],
  kitchen: ["dashboard", "kitchen", "menu", "inventory"],
  warehouse: ["dashboard", "inventory", "suppliers", "menu"],
};
