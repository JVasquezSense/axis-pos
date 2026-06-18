// ============================================================================
// Tipos de dominio — Axis POS
// Diseñados para mapear 1:1 con los serializers de Django REST Framework.
// ============================================================================

export type Role = "admin" | "waiter" | "cashier" | "kitchen";

export interface RoleConfig {
  id: Role;
  label: string;
  description: string;
  color: string; // tailwind token base, p.ej. "violet"
  defaultRoute: string;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export interface Kpi {
  id: string;
  label: string;
  value: number;
  format: "currency" | "number" | "percent";
  delta: number; // variación % vs periodo anterior
  icon: string; // nombre de icono lucide
  spark: number[];
  info?: string; // explicación de cómo se calcula (tooltip)
}

export interface YoYPoint {
  label: string;
  current: number;
  previous: number;
}

export interface TimeSeriesPoint {
  label: string;
  value: number;
  secondary?: number;
}

export interface TopProduct {
  id: string;
  name: string;
  category: string;
  units: number;
  revenue: number;
  image: string;
}

export interface AlertItem {
  id: string;
  type: "stock" | "kitchen" | "payment" | "system";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  time: string;
}

export interface DashboardData {
  kpis: Kpi[];
  salesByHour: TimeSeriesPoint[];
  salesByDay: TimeSeriesPoint[];
  salesVsLastYear: YoYPoint[];
  topProducts: TopProduct[];
  alerts: AlertItem[];
  occupancy: { occupied: number; total: number };
  kitchenLoad: { active: number; avgMinutes: number };
  criticalStock: number;
}

// ---------------------------------------------------------------------------
// Salón / Mesas
// ---------------------------------------------------------------------------
export type TableStatus = "available" | "occupied" | "reserved" | "billing";

export interface RestaurantTable {
  id: string;
  number: number;
  capacity: number;
  status: TableStatus;
  zone: string;
  waiter?: string;
  guests?: number;
  seatedAt?: string; // ISO
  orderTotal?: number;
  x: number; // posición % en el mapa
  y: number;
  shape: "round" | "square" | "rect";
}

// ---------------------------------------------------------------------------
// Productos / Menú
// ---------------------------------------------------------------------------
export interface ModifierOption {
  id: string;
  name: string;
  price: number;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  multiple: boolean;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string;
  tags: string[];
  available: boolean;
  prepMinutes: number;
  modifiers?: ModifierGroup[];
  popular?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Pedidos / Orden
// ---------------------------------------------------------------------------
export interface OrderLine {
  id: string;
  product: Product;
  quantity: number;
  modifiers: ModifierOption[];
  notes?: string;
  unitPrice: number;
}

export type OrderStatus = "draft" | "pending" | "preparing" | "ready" | "served" | "paid";
export type OrderChannel = "dine_in" | "takeaway" | "delivery" | "web";

export interface Order {
  id: string;
  code: string;
  tableNumber?: number;
  channel: OrderChannel;
  status: OrderStatus;
  lines: OrderLine[];
  waiter?: string;
  customer?: string;
  createdAt: string;
  subtotal: number;
  tax: number;
  total: number;
}

// ---------------------------------------------------------------------------
// Cocina KDS
// ---------------------------------------------------------------------------
export type KdsStatus = "pending" | "preparing" | "ready";

export interface KdsTicket {
  id: string;
  code: string;
  table?: number;
  channel: OrderChannel;
  status: KdsStatus;
  createdAt: string; // ISO
  items: { name: string; quantity: number; notes?: string; done?: boolean }[];
  priority: boolean;
}

// ---------------------------------------------------------------------------
// Inventario
// ---------------------------------------------------------------------------
export type StockStatus = "normal" | "low" | "critical";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  minStock: number;
  cost: number;
  supplier: string;
  status: StockStatus;
  updatedAt: string;
}

// Kardex / movimientos
export type MovementType = "inicial" | "entrada" | "salida" | "ajuste";

export interface InventoryMovement {
  id: string;
  inventoryId: string;
  date: string;
  type: MovementType;
  quantity: number; // + entrada / − salida
  balance: number; // saldo tras el movimiento
  unitCost: number;
  reason: string;
}

export interface PhysicalCount {
  inventoryId: string;
  theoretical: number; // saldo teórico (sistema)
  physical: number; // conteo físico
}

// ---------------------------------------------------------------------------
// CRM / Clientes
// ---------------------------------------------------------------------------
export type LoyaltyTier = "bronze" | "silver" | "gold" | "platinum";

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  lastVisit: string;
  totalSpent: number;
  visits: number;
  points: number;
  tier: LoyaltyTier;
  avatar?: string;
  history: { date: string; code: string; total: number; items: number }[];
  coupons: { id: string; label: string; value: string; expires: string }[];
}

// ---------------------------------------------------------------------------
// Pagos
// ---------------------------------------------------------------------------
export type PaymentMethod = "cash" | "card" | "nequi" | "daviplata" | "pse";

export interface PaymentBreakdown {
  subtotal: number;
  tax: number;
  taxRate: number;
  discount: number;
  tip: number;
  total: number;
}

export interface Invoice {
  id: string;
  code: string;
  date: string;
  method: PaymentMethod;
  breakdown: PaymentBreakdown;
  table?: number;
  cashier: string;
}

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------
export interface ReportData {
  kpis: Kpi[];
  revenueTrend: TimeSeriesPoint[];
  profitTrend: TimeSeriesPoint[];
  categoryMix: { name: string; value: number; color: string }[];
  channelMix: { name: string; value: number; color: string }[];
  hourlyHeat: TimeSeriesPoint[];
}

// ---------------------------------------------------------------------------
// Super Admin SaaS
// ---------------------------------------------------------------------------
export type TenantPlan = "starter" | "growth" | "enterprise";
export type TenantStatus = "active" | "trial" | "past_due" | "churned";

export interface Tenant {
  id: string;
  name: string;
  logo: string;
  plan: TenantPlan;
  status: TenantStatus;
  mrr: number;
  locations: number;
  users: number;
  ordersMonth: number;
  joinedAt: string;
  city: string;
}

export interface SaasMetrics {
  kpis: Kpi[];
  mrrTrend: TimeSeriesPoint[];
  planMix: { name: string; value: number; color: string }[];
  churn: number;
  arpa: number;
}

// ---------------------------------------------------------------------------
// Recetas / Fichas técnicas (Bill of Materials)
// ---------------------------------------------------------------------------
export type RecipeStatus = "active" | "draft" | "archived";
export type RecipeStation = "grill" | "fry" | "cold" | "bar" | "pastry";
export type RecipeDifficulty = "easy" | "medium" | "hard";
export type Allergen = "gluten" | "lacteos" | "huevo" | "mani" | "mariscos" | "soya" | "pescado";

/** Insumo consumido por una receta (enlaza con InventoryItem). */
export interface RecipeIngredient {
  id: string;
  inventoryId: string;
  name: string; // denormalizado para mostrar
  unit: string; // unidad base del insumo (kg, und, L…)
  quantity: number; // cantidad por rendimiento total de la receta
  waste: number; // % de merma 0..1 (factor de rendimiento)
}

/** Variación de una receta: precio propio + insumos adicionales. */
export interface RecipeVariation {
  id: string;
  name: string;
  priceDelta: number; // +/- sobre el precio base
  extraIngredients: RecipeIngredient[];
  isDefault?: boolean;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  category: string; // id de categoría del menú
  productId?: string; // producto del menú vinculado
  status: RecipeStatus;
  station: RecipeStation;
  difficulty: RecipeDifficulty;
  portions: number; // rendimiento (porciones que produce)
  prepMinutes: number;
  price: number; // precio de venta base
  ingredients: RecipeIngredient[];
  variations: RecipeVariation[];
  steps: string[];
  allergens: Allergen[];
  tags: string[];
  updatedAt: string;
}

/** Resultado del motor de costeo de una receta. */
export interface RecipeCost {
  totalCost: number; // costo de insumos para todo el rendimiento
  costPerPortion: number;
  foodCostPct: number; // costPerPortion / price
  margin: number; // price - costPerPortion
  marginPct: number;
  suggestedPrice: number; // según food cost objetivo
  maxPortions: number; // porciones preparables con el stock actual
}
