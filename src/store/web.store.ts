import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, PaymentMethod } from "@/types";

export interface WebCartLine {
  product: Product;
  quantity: number;
}

/**
 * Ciclo de vida de un pedido web:
 *  awaiting_receipt → cliente realizó el pedido, falta subir comprobante
 *  review           → comprobante subido, pendiente de verificación del admin
 *  verified         → admin confirmó el pago (pasa a cocina)
 *  dispatched       → admin despachó el pedido
 *  rejected         → admin rechazó el comprobante
 */
export type WebOrderStatus = "awaiting_receipt" | "review" | "verified" | "dispatched" | "rejected";

export interface LiveWebOrder {
  id: string;
  code: string;
  customer: string;
  phone: string;
  address?: string;
  method: PaymentMethod;
  items: number;
  lines: { name: string; quantity: number }[];
  total: number;
  createdAt: number;
  receipt?: string; // data URL del comprobante
  status: WebOrderStatus;
}

interface WebState {
  cart: WebCartLine[];
  liveOrders: LiveWebOrder[];
  add: (product: Product) => void;
  increment: (id: string) => void;
  decrement: (id: string) => void;
  clear: () => void;
  submitOrder: (customer: string, phone: string, method: PaymentMethod) => LiveWebOrder;
  uploadReceipt: (id: string, receipt: string) => void;
  verifyOrder: (id: string) => void;
  dispatchOrder: (id: string) => void;
  rejectOrder: (id: string) => void;
}

let seq = 1060;

export const useWebStore = create<WebState>()(
  persist(
    (set, get) => ({
  cart: [],
  liveOrders: [],
  add: (product) =>
    set((s) => {
      const existing = s.cart.find((l) => l.product.id === product.id);
      if (existing) {
        return {
          cart: s.cart.map((l) =>
            l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
          ),
        };
      }
      return { cart: [...s.cart, { product, quantity: 1 }] };
    }),
  increment: (id) =>
    set((s) => ({
      cart: s.cart.map((l) => (l.product.id === id ? { ...l, quantity: l.quantity + 1 } : l)),
    })),
  decrement: (id) =>
    set((s) => ({
      cart: s.cart
        .map((l) => (l.product.id === id ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    })),
  clear: () => set({ cart: [] }),

  submitOrder: (customer, phone, method) => {
    const { cart } = get();
    const total = cart.reduce((s, l) => s + l.product.price * l.quantity, 0);
    const items = cart.reduce((s, l) => s + l.quantity, 0);
    const order: LiveWebOrder = {
      id: `web-${Date.now()}`,
      code: `#${seq++}`,
      customer,
      phone,
      method,
      total,
      items,
      lines: cart.map((l) => ({ name: l.product.name, quantity: l.quantity })),
      createdAt: Date.now(),
      status: "awaiting_receipt",
    };
    set((s) => ({ liveOrders: [order, ...s.liveOrders].slice(0, 12), cart: [] }));
    return order;
  },

  uploadReceipt: (id, receipt) =>
    set((s) => ({
      liveOrders: s.liveOrders.map((o) =>
        o.id === id ? { ...o, receipt, status: "review" } : o
      ),
    })),

  verifyOrder: (id) =>
    set((s) => ({
      liveOrders: s.liveOrders.map((o) => (o.id === id ? { ...o, status: "verified" } : o)),
    })),

  dispatchOrder: (id) =>
    set((s) => ({
      liveOrders: s.liveOrders.map((o) => (o.id === id ? { ...o, status: "dispatched" } : o)),
    })),

  rejectOrder: (id) =>
    set((s) => ({
      liveOrders: s.liveOrders.map((o) => (o.id === id ? { ...o, status: "rejected" } : o)),
    })),
    }),
    {
      name: "axis-web",
      version: 1,
      // No persistimos las imágenes de comprobante (data URLs) para no saturar localStorage
      partialize: (s) => ({
        cart: s.cart,
        liveOrders: s.liveOrders.map((o) => ({ ...o, receipt: undefined })),
      }),
    }
  )
);

export const WEB_ORDER_STATUS: Record<
  WebOrderStatus,
  { label: string; variant: "success" | "warning" | "secondary" | "destructive" }
> = {
  awaiting_receipt: { label: "Esperando comprobante", variant: "secondary" },
  review: { label: "Por verificar", variant: "warning" },
  verified: { label: "Pago verificado", variant: "success" },
  dispatched: { label: "Despachado", variant: "success" },
  rejected: { label: "Rechazado", variant: "destructive" },
};
