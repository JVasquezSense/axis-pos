import type { TableStatus, StockStatus, KdsStatus, LoyaltyTier, TenantStatus } from "@/types";

export const TABLE_STATUS: Record<
  TableStatus,
  { label: string; dot: string; ring: string; surface: string; text: string }
> = {
  available: { label: "Disponible", dot: "bg-emerald-500", ring: "ring-emerald-500/30", surface: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-600 dark:text-emerald-400" },
  occupied: { label: "Ocupada", dot: "bg-primary", ring: "ring-primary/30", surface: "bg-primary/10 border-primary/30", text: "text-primary" },
  reserved: { label: "Reservada", dot: "bg-amber-500", ring: "ring-amber-500/30", surface: "bg-amber-500/10 border-amber-500/30", text: "text-amber-600 dark:text-amber-400" },
  billing: { label: "Cuenta pendiente", dot: "bg-rose-500", ring: "ring-rose-500/30", surface: "bg-rose-500/10 border-rose-500/30", text: "text-rose-600 dark:text-rose-400" },
};

export const STOCK_STATUS: Record<StockStatus, { label: string; variant: "success" | "warning" | "destructive" }> = {
  normal: { label: "Normal", variant: "success" },
  low: { label: "Bajo", variant: "warning" },
  critical: { label: "Crítico", variant: "destructive" },
};

export const KDS_STATUS: Record<KdsStatus, { label: string; accent: string }> = {
  pending: { label: "Pendiente", accent: "border-t-slate-400" },
  preparing: { label: "Preparando", accent: "border-t-amber-500" },
  ready: { label: "Listo", accent: "border-t-emerald-500" },
};

export const LOYALTY: Record<LoyaltyTier, { label: string; className: string }> = {
  bronze: { label: "Bronce", className: "bg-amber-700/15 text-amber-700 dark:text-amber-500" },
  silver: { label: "Plata", className: "bg-slate-400/20 text-slate-600 dark:text-slate-300" },
  gold: { label: "Oro", className: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" },
  platinum: { label: "Platino", className: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
};

export const TENANT_STATUS: Record<TenantStatus, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  active: { label: "Activo", variant: "success" },
  trial: { label: "Prueba", variant: "secondary" },
  past_due: { label: "Mora", variant: "warning" },
  churned: { label: "Cancelado", variant: "destructive" },
};

export const PLAN_LABEL: Record<string, string> = {
  starter: "Starter",
  growth: "Growth",
  enterprise: "Enterprise",
};
