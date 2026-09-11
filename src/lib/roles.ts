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
  delivery: {
    id: "delivery",
    label: "Domiciliario",
    description: "Entregas a domicilio y seguimiento de pedidos",
    color: "orange",
    defaultRoute: "/delivery",
  },
};

export const ROLE_LIST = Object.values(ROLES);

/** Rutas visibles por rol en la navegación */
export const ROLE_NAV: Record<Role, string[]> = {
  admin: [
    "dashboard", "salon", "reservations", "orders", "kitchen",
    "checkout", "shift", "history", "returns", "shift-history", "menu", "inventory", "suppliers",
    "employees", "audit", "crm", "reports", "delivery", "delivery-admin", "weborders", "website", "admin",
  ],
  waiter: ["dashboard", "salon", "reservations", "orders", "kitchen"],
  cashier: ["dashboard", "checkout", "shift", "history", "returns", "shift-history", "salon", "weborders", "crm", "employees"],
  kitchen: ["dashboard", "kitchen", "menu", "inventory"],
  warehouse: ["dashboard", "inventory", "suppliers", "menu"],
  delivery: ["delivery"],
};

/**
 * Secciones a las que puede entrar el usuario: la unión de todos sus roles.
 *
 * La vista activa (`role`) solo cambia el tablero de inicio; quien es cajero y
 * mesero tiene que ver las secciones de los dos sin cambiar de vista. Sin roles
 * resueltos (superadmin o modo demo) manda la vista activa.
 */
export function navKeysFor(role: Role, userRoles: Role[] | null | undefined): string[] {
  const roles = userRoles && userRoles.length > 0 ? userRoles : [role];
  const keys = new Set<string>();
  for (const r of roles) for (const k of ROLE_NAV[r] ?? []) keys.add(k);
  return [...keys];
}
