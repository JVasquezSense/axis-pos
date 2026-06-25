import type {
  DashboardData,
  KdsTicket,
  InventoryItem,
  Customer,
  ReportData,
  Tenant,
  SaasMetrics,
  Order,
} from "@/types";
import { PRODUCTS } from "./menu";

const now = Date.now();
const minsAgo = (m: number) => new Date(now - m * 60000).toISOString();

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export const DASHBOARD: DashboardData = {
  kpis: [
    { id: "sales", label: "Ventas del día", value: 4287500, format: "currency", delta: 12.4, icon: "DollarSign", spark: [12, 18, 14, 22, 28, 24, 32, 38, 35, 42] },
    { id: "orders", label: "Pedidos activos", value: 23, format: "number", delta: 8.1, icon: "ShoppingBag", spark: [8, 10, 9, 12, 14, 13, 16, 18, 20, 23] },
    { id: "avg", label: "Ticket promedio", value: 64200, format: "currency", delta: 4.7, icon: "Receipt", spark: [55, 58, 56, 60, 59, 62, 61, 63, 64, 64], info: "Ventas del día ÷ número de pedidos cerrados. Hoy: $4.287.500 ÷ 67 pedidos ≈ $64.200. Mide cuánto gasta en promedio cada mesa/cliente." },
    { id: "margin", label: "Margen bruto", value: 68.5, format: "percent", delta: -1.2, icon: "TrendingUp", spark: [70, 69, 71, 68, 69, 67, 68, 69, 68, 68], info: "(Ventas − Costo de insumos) ÷ Ventas × 100. Usa el costeo de las recetas (food cost). Hoy las ventas dejan 68,5% después de descontar la materia prima." },
  ],
  salesByHour: [
    { label: "08", value: 120000 }, { label: "10", value: 280000 },
    { label: "12", value: 720000 }, { label: "13", value: 890000 },
    { label: "14", value: 640000 }, { label: "16", value: 320000 },
    { label: "18", value: 410000 }, { label: "19", value: 680000 },
    { label: "20", value: 920000 }, { label: "21", value: 760000 },
    { label: "22", value: 430000 },
  ],
  salesByDay: [
    { label: "Lun", value: 3850000, secondary: 3200000 },
    { label: "Mar", value: 4120000, secondary: 3600000 },
    { label: "Mié", value: 3980000, secondary: 3900000 },
    { label: "Jue", value: 4520000, secondary: 4100000 },
    { label: "Vie", value: 6230000, secondary: 5400000 },
    { label: "Sáb", value: 7840000, secondary: 6800000 },
    { label: "Dom", value: 5210000, secondary: 4900000 },
  ],
  salesVsLastYear: [
    { label: "Ene", current: 98000000, previous: 82000000 },
    { label: "Feb", current: 102000000, previous: 86000000 },
    { label: "Mar", current: 112000000, previous: 91000000 },
    { label: "Abr", current: 108000000, previous: 95000000 },
    { label: "May", current: 119000000, previous: 99000000 },
    { label: "Jun", current: 128450000, previous: 104000000 },
    { label: "Jul", current: 124000000, previous: 108000000 },
    { label: "Ago", current: 131000000, previous: 112000000 },
    { label: "Sep", current: 126000000, previous: 110000000 },
    { label: "Oct", current: 134000000, previous: 115000000 },
    { label: "Nov", current: 142000000, previous: 121000000 },
    { label: "Dic", current: 158000000, previous: 133000000 },
  ],
  topProducts: [
    { id: "p5", name: "Axis Classic", category: "Hamburguesas", units: 87, revenue: 2427300, image: "🍔" },
    { id: "p10", name: "Bife de Chorizo", category: "Carnes", units: 41, revenue: 2414900, image: "🥩" },
    { id: "p14", name: "Limonada de Coco", category: "Bebidas", units: 134, revenue: 1728600, image: "🥥" },
    { id: "p19", name: "Brownie con Helado", category: "Postres", units: 76, revenue: 1284400, image: "🍫" },
    { id: "p6", name: "Doble Bacon", category: "Hamburguesas", units: 52, revenue: 1918800, image: "🥓" },
  ],
  alerts: [
    { id: "a1", type: "stock", severity: "critical", title: "Carne de res por agotarse", description: "Quedan 2.1 kg — alcanza para ~10 órdenes", time: "Hace 5 min" },
    { id: "a2", type: "kitchen", severity: "warning", title: "Mesa 7 lleva 24 min", description: "Pedido #1042 supera el tiempo objetivo", time: "Hace 8 min" },
    { id: "a3", type: "payment", severity: "info", title: "Cierre de caja pendiente", description: "Turno tarde sin arquear desde las 14:00", time: "Hace 22 min" },
    { id: "a4", type: "stock", severity: "warning", title: "Queso cheddar bajo", description: "Stock al 18% del mínimo recomendado", time: "Hace 35 min" },
  ],
  occupancy: { occupied: 5, total: 12 },
  kitchenLoad: { active: 6, avgMinutes: 14 },
  criticalStock: 3,
};

// ---------------------------------------------------------------------------
// Cocina KDS
// ---------------------------------------------------------------------------
export const KDS_TICKETS: KdsTicket[] = [
  { id: "k1", code: "#1051", table: 8, channel: "dine_in", status: "pending", createdAt: minsAgo(3), priority: false, items: [{ name: "Axis Classic", quantity: 2, notes: "Sin cebolla" }, { name: "Limonada de Coco", quantity: 2 }, { name: "Tabla de Nachos", quantity: 1 }] },
  { id: "k2", code: "#1052", table: 5, channel: "dine_in", status: "pending", createdAt: minsAgo(6), priority: false, items: [{ name: "Crispy Chicken", quantity: 1 }, { name: "Cerveza Artesanal", quantity: 1 }] },
  { id: "k3", code: "#1048", table: 7, channel: "dine_in", status: "preparing", createdAt: minsAgo(14), priority: true, items: [{ name: "Bife de Chorizo", quantity: 1, notes: "Término medio", done: true }, { name: "Costillas BBQ", quantity: 1 }, { name: "Mojito Clásico", quantity: 2, done: true }] },
  { id: "k4", code: "#1049", table: 2, channel: "web", status: "preparing", createdAt: minsAgo(9), priority: false, items: [{ name: "Doble Bacon", quantity: 1, done: true }, { name: "Veggie Deluxe", quantity: 1 }] },
  { id: "k5", code: "#1045", table: 10, channel: "dine_in", status: "ready", createdAt: minsAgo(18), priority: false, items: [{ name: "Salmón a la Plancha", quantity: 1, done: true }, { name: "Jugo Natural", quantity: 1, done: true }] },
  { id: "k6", code: "#1046", channel: "delivery", status: "ready", createdAt: minsAgo(21), priority: false, items: [{ name: "Brownie con Helado", quantity: 2, done: true }, { name: "Cheesecake de Maracuyá", quantity: 1, done: true }] },
];

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------
export const INVENTORY: InventoryItem[] = [
  { id: "i1", name: "Carne de res molida", category: "Carnes", stock: 2.1, unit: "kg", minStock: 8, cost: 28000, supplier: "Frigorífico La 70", status: "critical", updatedAt: "Hace 12 min" },
  { id: "i2", name: "Pan de hamburguesa", category: "Panadería", stock: 34, unit: "und", minStock: 40, cost: 1200, supplier: "Panadería El Trigal", status: "low", updatedAt: "Hace 1 h" },
  { id: "i3", name: "Queso cheddar", category: "Lácteos", stock: 1.8, unit: "kg", minStock: 5, cost: 32000, supplier: "Lácteos Andinos", status: "critical", updatedAt: "Hace 25 min" },
  { id: "i4", name: "Tocineta", category: "Carnes", stock: 4.5, unit: "kg", minStock: 4, cost: 38000, supplier: "Frigorífico La 70", status: "normal", updatedAt: "Hace 2 h" },
  { id: "i5", name: "Papa criolla", category: "Verduras", stock: 22, unit: "kg", minStock: 15, cost: 4500, supplier: "Plaza Mayorista", status: "normal", updatedAt: "Hace 3 h" },
  { id: "i6", name: "Lechuga batavia", category: "Verduras", stock: 6, unit: "kg", minStock: 8, cost: 6000, supplier: "Plaza Mayorista", status: "low", updatedAt: "Hace 4 h" },
  { id: "i7", name: "Tomate chonto", category: "Verduras", stock: 14, unit: "kg", minStock: 10, cost: 5200, supplier: "Plaza Mayorista", status: "normal", updatedAt: "Hace 4 h" },
  { id: "i8", name: "Aceite de girasol", category: "Abarrotes", stock: 18, unit: "L", minStock: 12, cost: 9800, supplier: "Distribuidora Sur", status: "normal", updatedAt: "Ayer" },
  { id: "i9", name: "Limón Tahití", category: "Frutas", stock: 9, unit: "kg", minStock: 12, cost: 4800, supplier: "Plaza Mayorista", status: "low", updatedAt: "Hace 6 h" },
  { id: "i10", name: "Salmón fresco", category: "Pescados", stock: 5.2, unit: "kg", minStock: 4, cost: 62000, supplier: "Pescados del Pacífico", status: "normal", updatedAt: "Hace 2 h" },
  { id: "i11", name: "Cerveza artesanal IPA", category: "Bebidas", stock: 48, unit: "und", minStock: 36, cost: 6500, supplier: "Cervecería Local", status: "normal", updatedAt: "Ayer" },
  { id: "i12", name: "Helado de vainilla", category: "Congelados", stock: 3, unit: "L", minStock: 6, cost: 18000, supplier: "Lácteos Andinos", status: "low", updatedAt: "Hace 5 h" },
];

// ---------------------------------------------------------------------------
// CRM / Clientes
// ---------------------------------------------------------------------------
export const CUSTOMERS: Customer[] = [
  { id: "c1", name: "María Fernanda López", phone: "300 245 1188", email: "mafe.lopez@email.com", lastVisit: "Hace 2 días", totalSpent: 1845000, visits: 28, points: 1240, tier: "platinum", history: [{ date: "13 Jun", code: "#1031", total: 124000, items: 4 }, { date: "8 Jun", code: "#0987", total: 86000, items: 3 }, { date: "1 Jun", code: "#0901", total: 158000, items: 6 }], coupons: [{ id: "cp1", label: "Postre gratis", value: "100%", expires: "30 Jun" }, { id: "cp2", label: "Cumpleaños", value: "-20%", expires: "15 Jul" }] },
  { id: "c2", name: "Andrés Gómez", phone: "311 678 9023", email: "andresg@email.com", lastVisit: "Ayer", totalSpent: 982000, visits: 16, points: 680, tier: "gold", history: [{ date: "14 Jun", code: "#1044", total: 92000, items: 3 }, { date: "5 Jun", code: "#0945", total: 67000, items: 2 }], coupons: [{ id: "cp3", label: "2x1 hamburguesas", value: "2x1", expires: "20 Jun" }] },
  { id: "c3", name: "Laura Restrepo", phone: "320 112 4567", email: "laura.r@email.com", lastVisit: "Hace 1 semana", totalSpent: 624000, visits: 11, points: 410, tier: "silver", history: [{ date: "7 Jun", code: "#0961", total: 54000, items: 2 }], coupons: [] },
  { id: "c4", name: "Carlos Mejía", phone: "315 889 2340", email: "carlosm@email.com", lastVisit: "Hace 3 días", totalSpent: 2410000, visits: 35, points: 1820, tier: "platinum", history: [{ date: "12 Jun", code: "#1019", total: 210000, items: 7 }, { date: "2 Jun", code: "#0912", total: 178000, items: 5 }], coupons: [{ id: "cp4", label: "Envío gratis", value: "Gratis", expires: "25 Jun" }] },
  { id: "c5", name: "Daniela Vargas", phone: "300 556 7781", email: "dani.vargas@email.com", lastVisit: "Hoy", totalSpent: 348000, visits: 6, points: 230, tier: "bronze", history: [{ date: "15 Jun", code: "#1050", total: 48000, items: 2 }], coupons: [] },
  { id: "c6", name: "Sebastián Torres", phone: "312 443 1029", email: "sebas.t@email.com", lastVisit: "Hace 5 días", totalSpent: 1156000, visits: 19, points: 790, tier: "gold", history: [{ date: "10 Jun", code: "#0998", total: 134000, items: 4 }], coupons: [{ id: "cp5", label: "-15% total", value: "-15%", expires: "28 Jun" }] },
  { id: "c7", name: "Valentina Ruiz", phone: "318 220 6654", email: "vale.ruiz@email.com", lastVisit: "Hace 2 semanas", totalSpent: 489000, visits: 9, points: 320, tier: "silver", history: [{ date: "1 Jun", code: "#0902", total: 72000, items: 3 }], coupons: [] },
  { id: "c8", name: "Juan David Pérez", phone: "301 778 9912", email: "jd.perez@email.com", lastVisit: "Ayer", totalSpent: 734000, visits: 13, points: 510, tier: "silver", history: [{ date: "14 Jun", code: "#1041", total: 88000, items: 3 }], coupons: [] },
];

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------
export const REPORTS: ReportData = {
  kpis: [
    { id: "rev", label: "Ventas (mes)", value: 128450000, format: "currency", delta: 18.2, icon: "DollarSign", spark: [] },
    { id: "profit", label: "Utilidad neta", value: 41600000, format: "currency", delta: 14.6, icon: "PiggyBank", spark: [] },
    { id: "avg", label: "Ticket promedio", value: 62800, format: "currency", delta: 3.4, icon: "Receipt", spark: [] },
    { id: "profitab", label: "Rentabilidad", value: 32.4, format: "percent", delta: 2.1, icon: "Percent", spark: [] },
  ],
  revenueTrend: [
    { label: "Ene", value: 98000000 }, { label: "Feb", value: 102000000 },
    { label: "Mar", value: 112000000 }, { label: "Abr", value: 108000000 },
    { label: "May", value: 119000000 }, { label: "Jun", value: 128450000 },
  ],
  profitTrend: [
    { label: "Ene", value: 28000000 }, { label: "Feb", value: 31000000 },
    { label: "Mar", value: 35000000 }, { label: "Abr", value: 33000000 },
    { label: "May", value: 38000000 }, { label: "Jun", value: 41600000 },
  ],
  categoryMix: [
    { name: "Hamburguesas", value: 38, color: "hsl(243 75% 59%)" },
    { name: "Carnes", value: 27, color: "hsl(160 84% 39%)" },
    { name: "Bebidas", value: 18, color: "hsl(38 92% 50%)" },
    { name: "Entradas", value: 10, color: "hsl(199 89% 48%)" },
    { name: "Postres", value: 7, color: "hsl(330 81% 60%)" },
  ],
  channelMix: [
    { name: "Salón", value: 54, color: "hsl(243 75% 59%)" },
    { name: "Domicilio", value: 28, color: "hsl(160 84% 39%)" },
    { name: "Web", value: 12, color: "hsl(38 92% 50%)" },
    { name: "Para llevar", value: 6, color: "hsl(199 89% 48%)" },
  ],
  paymentMix: [
    { name: "Efectivo", value: 38, color: "hsl(142 64% 40%)" },
    { name: "Tarjeta", value: 32, color: "hsl(199 89% 48%)" },
    { name: "Nequi", value: 18, color: "hsl(291 64% 52%)" },
    { name: "Daviplata", value: 8, color: "hsl(0 70% 50%)" },
    { name: "PSE", value: 4, color: "hsl(243 60% 55%)" },
  ],
  salesByLocation: [
    { name: "Sede Centro", value: 52800000, avg: 44000000 },
    { name: "Sede Norte", value: 38600000, avg: 44000000 },
    { name: "Sede Sur", value: 24300000, avg: 44000000 },
    { name: "Sede Llanograde", value: 12750000, avg: 44000000 },
  ],
  topDishes: [
    { name: "Axis Classic", units: 87, revenue: 2427300, avg: 1755000 },
    { name: "Bife de Chorizo", units: 41, revenue: 2414900, avg: 1755000 },
    { name: "Limonada de Coco", units: 134, revenue: 1728600, avg: 1755000 },
    { name: "Doble Bacon", units: 52, revenue: 1918800, avg: 1755000 },
    { name: "Brownie con Helado", units: 76, revenue: 1284400, avg: 1755000 },
  ],
  hourlyHeat: [
    { label: "08", value: 12 }, { label: "10", value: 28 }, { label: "12", value: 72 },
    { label: "14", value: 64 }, { label: "16", value: 32 }, { label: "18", value: 48 },
    { label: "20", value: 92 }, { label: "22", value: 43 },
  ],
};

// ---------------------------------------------------------------------------
// Super Admin SaaS
// ---------------------------------------------------------------------------
const ALL_FEATURES = {
  pos: true, kitchen: true, inventory: true, recipes: true,
  salon: true, reservations: true, crm: true, suppliers: true,
  employees: true, reports: true, website: true, web_orders: true,
};

export const TENANTS: Tenant[] = [
  { id: "rt1", name: "Demo Burger", logo: "🍔", plan: "growth", status: "active", mrr: 349000, locations: 3, users: 18, ordersMonth: 4280, joinedAt: "Mar 2024", city: "Medellín", features: ALL_FEATURES },
  { id: "rt2", name: "Sushi Zen", logo: "🍣", plan: "enterprise", status: "active", mrr: 890000, locations: 7, users: 52, ordersMonth: 9120, joinedAt: "Ene 2024", city: "Bogotá", features: ALL_FEATURES },
  { id: "rt3", name: "Pizza Nostra", logo: "🍕", plan: "growth", status: "active", mrr: 349000, locations: 4, users: 24, ordersMonth: 5640, joinedAt: "May 2024", city: "Cali", features: ALL_FEATURES },
  { id: "rt4", name: "Taco Loco", logo: "🌮", plan: "starter", status: "trial", mrr: 0, locations: 1, users: 6, ordersMonth: 980, joinedAt: "Jun 2024", city: "Barranquilla", features: { ...ALL_FEATURES, recipes: false, crm: false } },
  { id: "rt5", name: "Café Aroma", logo: "☕", plan: "starter", status: "active", mrr: 129000, locations: 1, users: 8, ordersMonth: 1820, joinedAt: "Abr 2024", city: "Medellín", features: { ...ALL_FEATURES, kitchen: false, web_orders: false } },
  { id: "rt6", name: "Parrilla Real", logo: "🥩", plan: "enterprise", status: "active", mrr: 890000, locations: 5, users: 41, ordersMonth: 7350, joinedAt: "Feb 2024", city: "Bogotá", features: ALL_FEATURES },
  { id: "rt7", name: "Veggie Garden", logo: "🥗", plan: "growth", status: "past_due", mrr: 349000, locations: 2, users: 12, ordersMonth: 2140, joinedAt: "Mar 2024", city: "Pereira", features: ALL_FEATURES },
  { id: "rt8", name: "Dulce Tentación", logo: "🍰", plan: "starter", status: "churned", mrr: 0, locations: 1, users: 4, ordersMonth: 0, joinedAt: "Dic 2023", city: "Bucaramanga", features: ALL_FEATURES },
  { id: "rt9", name: "Mariscos del Puerto", logo: "🦐", plan: "growth", status: "active", mrr: 349000, locations: 2, users: 16, ordersMonth: 3210, joinedAt: "May 2024", city: "Cartagena", features: ALL_FEATURES },
  { id: "rt10", name: "Pollo Brasa", logo: "🍗", plan: "enterprise", status: "active", mrr: 890000, locations: 9, users: 68, ordersMonth: 11200, joinedAt: "Nov 2023", city: "Bogotá", features: ALL_FEATURES },
];

export const SAAS_METRICS: SaasMetrics = {
  kpis: [
    { id: "mrr", label: "MRR", value: 5294000, format: "currency", delta: 9.8, icon: "TrendingUp", spark: [38, 41, 43, 46, 48, 50, 52, 53] },
    { id: "tenants", label: "Restaurantes activos", value: 8, format: "number", delta: 14.3, icon: "Store", spark: [4, 5, 5, 6, 7, 7, 8, 8] },
    { id: "users", label: "Usuarios totales", value: 249, format: "number", delta: 11.2, icon: "Users", spark: [180, 195, 205, 218, 228, 235, 242, 249] },
    { id: "churn", label: "Churn mensual", value: 2.4, format: "percent", delta: -0.6, icon: "Activity", spark: [4, 3.5, 3.2, 3, 2.8, 2.6, 2.5, 2.4] },
  ],
  mrrTrend: [
    { label: "Ene", value: 3820000 }, { label: "Feb", value: 4120000 },
    { label: "Mar", value: 4380000 }, { label: "Abr", value: 4610000 },
    { label: "May", value: 4920000 }, { label: "Jun", value: 5294000 },
  ],
  planMix: [
    { name: "Enterprise", value: 3, color: "hsl(243 75% 59%)" },
    { name: "Growth", value: 4, color: "hsl(160 84% 39%)" },
    { name: "Starter", value: 3, color: "hsl(38 92% 50%)" },
  ],
  churn: 2.4,
  arpa: 661750,
};

// ---------------------------------------------------------------------------
// Pedidos activos (lista global)
// ---------------------------------------------------------------------------
const line = (pid: string, qty: number) => {
  const product = PRODUCTS.find((p) => p.id === pid)!;
  return { id: `${pid}-${qty}`, product, quantity: qty, modifiers: [], unitPrice: product.price };
};

export const ORDERS: Order[] = ([
  { id: "o1", code: "#1051", tableNumber: 8, channel: "dine_in", status: "pending", waiter: "Valentina G.", lines: [line("p5", 2), line("p14", 2), line("p1", 1)], createdAt: minsAgo(3), subtotal: 0, tax: 0, total: 0 },
  { id: "o2", code: "#1048", tableNumber: 7, channel: "dine_in", status: "preparing", waiter: "Andrés M.", lines: [line("p5", 2), line("p6", 1), line("p14", 2)], createdAt: minsAgo(14), subtotal: 0, tax: 0, total: 0 },
  { id: "o3", code: "#1049", tableNumber: 2, channel: "web", status: "preparing", customer: "Daniela Vargas", lines: [line("p6", 1), line("p8", 1)], createdAt: minsAgo(9), subtotal: 0, tax: 0, total: 0 },
  { id: "o4", code: "#1045", tableNumber: 10, channel: "dine_in", status: "ready", waiter: "Valentina G.", lines: [line("p13", 1), line("p17", 1)], createdAt: minsAgo(18), subtotal: 0, tax: 0, total: 0 },
  { id: "o5", code: "#1046", channel: "delivery", status: "ready", customer: "Carlos Mejía", lines: [line("p19", 2), line("p20", 1)], createdAt: minsAgo(21), subtotal: 0, tax: 0, total: 0 },
] as Order[]).map((o): Order => {
  const subtotal = o.lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const tax = Math.round(subtotal * 0.08);
  return { ...o, subtotal, tax, total: subtotal + tax };
});
