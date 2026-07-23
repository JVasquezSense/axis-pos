export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: string; // lucide icon name
  badge?: string;
  group: "Operación" | "Gestión" | "Plataforma";
}

export const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", group: "Operación" },
  { key: "salon", label: "Salón", href: "/salon", icon: "Armchair", group: "Operación" },
  { key: "reservations", label: "Reservaciones", href: "/reservations", icon: "CalendarClock", group: "Operación" },
  { key: "orders", label: "Pedidos", href: "/orders", icon: "ClipboardList", group: "Operación" },
  { key: "kitchen", label: "Cocina KDS", href: "/kitchen", icon: "ChefHat", badge: "live", group: "Operación" },
  { key: "checkout", label: "Caja", href: "/checkout", icon: "CreditCard", group: "Operación" },
  { key: "shift", label: "Cierre de turno", href: "/shift", icon: "TimerOff", group: "Operación" },
  { key: "history", label: "Historial ventas", href: "/history", icon: "History", group: "Gestión" },
  { key: "returns", label: "Devoluciones", href: "/returns", icon: "RotateCcw", group: "Gestión" },
  { key: "shift-history", label: "Historial turnos", href: "/shift-history", icon: "Clock", group: "Gestión" },
  { key: "weborders", label: "Pedidos web", href: "/web-orders", icon: "ShoppingBag", badge: "live", group: "Operación" },
  { key: "menu", label: "Menú & Recetas", href: "/menu", icon: "UtensilsCrossed", group: "Gestión" },
  { key: "inventory", label: "Inventario", href: "/inventory", icon: "Boxes", group: "Gestión" },
  { key: "suppliers", label: "Proveedores", href: "/suppliers", icon: "Truck", group: "Gestión" },
  { key: "employees", label: "Empleados", href: "/employees", icon: "UserCog", group: "Gestión" },
  { key: "audit", label: "Auditoría", href: "/audit", icon: "ClipboardCheck", group: "Gestión" },
  { key: "crm", label: "Clientes", href: "/crm", icon: "Users", group: "Gestión" },
  { key: "reports", label: "Reportes", href: "/reports", icon: "BarChart3", group: "Gestión" },
  { key: "delivery", label: "Mi ruta", href: "/delivery", icon: "Bike", group: "Operación" },
  { key: "delivery-admin", label: "Domicilios", href: "/delivery-admin", icon: "MapPin", group: "Gestión" },
  { key: "website", label: "Página web", href: "/website", icon: "Globe", group: "Plataforma" },
  { key: "admin", label: "Super Admin", href: "/admin", icon: "ShieldCheck", group: "Plataforma" },
];

export const NAV_GROUPS = ["Operación", "Gestión", "Plataforma"] as const;
