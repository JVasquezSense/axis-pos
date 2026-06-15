import type { PaymentMethod } from "@/types";

export const PAYMENT_METHODS: {
  id: PaymentMethod;
  label: string;
  icon: string;
  hint: string;
  color: string;
}[] = [
  { id: "cash", label: "Efectivo", icon: "Banknote", hint: "Pago en caja", color: "text-emerald-500 bg-emerald-500/10" },
  { id: "card", label: "Tarjeta", icon: "CreditCard", hint: "Débito / Crédito", color: "text-sky-500 bg-sky-500/10" },
  { id: "nequi", label: "Nequi", icon: "Smartphone", hint: "Pago QR", color: "text-fuchsia-500 bg-fuchsia-500/10" },
  { id: "daviplata", label: "Daviplata", icon: "Smartphone", hint: "Pago QR", color: "text-red-500 bg-red-500/10" },
  { id: "pse", label: "PSE", icon: "Landmark", hint: "Transferencia", color: "text-indigo-500 bg-indigo-500/10" },
];

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  nequi: "Nequi",
  daviplata: "Daviplata",
  pse: "PSE",
};
