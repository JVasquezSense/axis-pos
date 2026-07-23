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
    return request<PublicMenu>(`/public/${slug}/menu/`);
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
