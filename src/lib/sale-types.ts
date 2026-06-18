export type SaleTypeId =
  | "dine_in"
  | "takeaway"
  | "delivery"
  | "rappi"
  | "staff"
  | "courtesy"
  | "happy"
  | "waste";

export interface SaleType {
  id: SaleTypeId;
  label: string;
  icon: string; // lucide
  hint: string;
  discountPct?: number; // descuento automático sobre subtotal
  noTax?: boolean; // exento de impuesto
  full?: boolean; // valor 0 (cortesía / baja)
}

export const SALE_TYPES: SaleType[] = [
  { id: "dine_in", label: "Mesa", icon: "Utensils", hint: "Consumo en el salón" },
  { id: "takeaway", label: "Para llevar", icon: "ShoppingBag", hint: "Retiro en tienda" },
  { id: "delivery", label: "Domicilio interno", icon: "Bike", hint: "Reparto propio" },
  { id: "rappi", label: "Rappi / App", icon: "Smartphone", hint: "Plataforma externa" },
  { id: "staff", label: "Consumo interno", icon: "Users", hint: "Personal · precio costo", discountPct: 0.5, noTax: true },
  { id: "happy", label: "Hora feliz / Promo", icon: "PartyPopper", hint: "Descuento promocional", discountPct: 0.2 },
  { id: "courtesy", label: "Cortesía", icon: "Gift", hint: "Invitación de la casa", full: true },
  { id: "waste", label: "Baja", icon: "Trash2", hint: "Merma / desperdicio", full: true },
];

export const SALE_TYPE_MAP = Object.fromEntries(SALE_TYPES.map((s) => [s.id, s])) as Record<SaleTypeId, SaleType>;
