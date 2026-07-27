import { request } from "./http";

/** Carta pública de un restaurante por slug (sin autenticación). */
export interface PublicMenu {
  restaurant: { id: string; name: string; logo: string; city: string; slug: string };
  categories: { id: string; name: string; icon: string }[];
  products: {
    id: string; name: string; description: string; price: number; category: string;
    image: string; available: boolean; prepMinutes: number; popular?: boolean;
  }[];
  tables: { id: string; number: number }[];
}

export interface PublicOrderResult {
  orderId: string;
  code: string;
  table: number | null;
  status: string;
  estimatedWait: number;
  /** true = se sumó a un pedido que la mesa ya tenía abierto. */
  merged?: boolean;
}

export interface PublicOrderStatus {
  id: string;
  code: string;
  status: string;
  table: number | null;
  estimatedWait: number;
  items: { name: string; quantity: number }[];
  createdAt: string;
}

/**
 * Servicios públicos para pedidos web + QR por mesa (backlog #8).
 * No usan USE_API: siempre van al backend (el cliente no tiene sesión).
 * La URL base la provee http.request (NEXT_PUBLIC_API_URL).
 */
export const publicService = {
  async getMenu(slug: string): Promise<PublicMenu> {
    const data = await request<PublicMenu>(`/public/${slug}/menu/`);
    // DRF serializa los decimales como string ("29900.00"): normalizar para que
    // la aritmética del carrito (totales, comparaciones) no se rompa.
    return {
      ...data,
      products: (data.products ?? []).map((p) => ({
        ...p,
        id: String(p.id),
        price: Number(p.price),
        category: String(p.category),
      })),
      categories: (data.categories ?? []).map((c) => ({ ...c, id: String(c.id) })),
    };
  },
  async createOrder(
    slug: string,
    payload: { table?: number | null; items: { productId: number; quantity: number; notes?: string }[]; customer?: string; phone?: string }
  ): Promise<PublicOrderResult> {
    return request<PublicOrderResult>(`/public/${slug}/order/`, {
      method: "POST", body: JSON.stringify(payload),
    });
  },
  async getStatus(orderId: string): Promise<PublicOrderStatus> {
    return request<PublicOrderStatus>(`/public/order/${orderId}/`);
  },
};
