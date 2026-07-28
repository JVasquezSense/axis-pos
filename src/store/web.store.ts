import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, PaymentMethod, ProductVariation } from "@/types";

export interface WebCartLine {
  product: Product;
  quantity: number;
  /** Notas por item del pedido web (ej. "sin cebolla"). */
  notes?: string;
  /** Variación elegida de la ficha técnica (ej. "Doble carne"). */
  variation?: ProductVariation;
}

/** Clave de línea: el mismo producto con distinta variación son líneas aparte. */
export function cartLineKey(l: Pick<WebCartLine, "product" | "variation">): string {
  return `${l.product.id}::${l.variation?.id ?? ""}`;
}

/** Precio unitario ya con el ajuste de la variación. */
export function cartLinePrice(l: Pick<WebCartLine, "product" | "variation">): number {
  return Number(l.product.price) + Number(l.variation?.priceDelta ?? 0);
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
  /** IDs de pedidos web enviados desde este dispositivo (persistido). */
  myOrderIds: string[];
  add: (product: Product, variation?: ProductVariation) => void;
  /** Reciben la clave de línea (producto+variación), no el id del producto. */
  increment: (key: string) => void;
  decrement: (key: string) => void;
  /** Notas por item del carrito web (ej. "sin cebolla"). */
  setNotes: (key: string, notes: string) => void;
  clear: () => void;
  /** Registra un pedido enviado para poder seguirlo en 'Mis pedidos'. */
  addMyOrder: (orderId: string) => void;
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
  myOrderIds: [],
  add: (product, variation) =>
    set((s) => {
      const key = cartLineKey({ product, variation });
      const existing = s.cart.find((l) => cartLineKey(l) === key);
      if (existing) {
        return {
          cart: s.cart.map((l) => (cartLineKey(l) === key ? { ...l, quantity: l.quantity + 1 } : l)),
        };
      }
      return { cart: [...s.cart, { product, quantity: 1, variation }] };
    }),
  increment: (key) =>
    set((s) => ({
      cart: s.cart.map((l) => (cartLineKey(l) === key ? { ...l, quantity: l.quantity + 1 } : l)),
    })),
  decrement: (key) =>
    set((s) => ({
      cart: s.cart
        .map((l) => (cartLineKey(l) === key ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    })),
  setNotes: (key, notes) =>
    set((s) => ({
      cart: s.cart.map((l) => (cartLineKey(l) === key ? { ...l, notes } : l)),
    })),
  clear: () => set({ cart: [] }),
  addMyOrder: (orderId) =>
    set((s) => ({
      myOrderIds: s.myOrderIds.includes(orderId) ? s.myOrderIds : [orderId, ...s.myOrderIds].slice(0, 50),
    })),

  submitOrder: (customer, phone, method) => {
    const { cart } = get();
    const total = cart.reduce((s, l) => s + cartLinePrice(l) * l.quantity, 0);
    const items = cart.reduce((s, l) => s + l.quantity, 0);
    const order: LiveWebOrder = {
      id: `web-${Date.now()}`,
      code: `#${seq++}`,
      customer,
      phone,
      method,
      total,
      items,
      lines: cart.map((l) => ({ name: l.variation ? `${l.product.name} (${l.variation.name})` : l.product.name, quantity: l.quantity })),
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
        myOrderIds: s.myOrderIds,
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
