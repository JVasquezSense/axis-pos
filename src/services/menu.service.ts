import type { Category, Product } from "@/types";
import { CATEGORIES, PRODUCTS } from "@/mock/menu";
import { USE_API, request, mockRequest } from "./http";

/**
 * DRF serializa los DecimalField como string ("29900.00"). Si eso entra al store
 * sin normalizar, la aritmética de precios se rompe: `price + extra` concatena
 * ("29900.008000") y `priceDelta` no ajusta el total. Normalizamos en el borde.
 */
function normalizeProduct(p: Product): Product {
  return {
    ...p,
    price: Number(p.price),
    variations: (p.variations ?? []).map((v) => ({ ...v, priceDelta: Number(v.priceDelta) })),
  };
}

export const menuService = {
  async getCategories(): Promise<Category[]> {
    return USE_API ? request<Category[]>("/menu/categories/") : mockRequest(CATEGORIES, 400);
  },
  async getProducts(): Promise<Product[]> {
    if (!USE_API) return mockRequest(PRODUCTS, 500);
    const products = await request<Product[]>("/menu/products/");
    return products.map(normalizeProduct);
  },
  async createCategory(c: Omit<Category, "id" | "count">): Promise<Category> {
    return USE_API
      ? request<Category>("/menu/categories/", { method: "POST", body: JSON.stringify(c) })
      : mockRequest({ ...c, id: `cat-${Date.now()}`, count: 0 } as Category, 200);
  },
  async updateCategory(c: Category): Promise<Category> {
    return USE_API
      ? request<Category>(`/menu/categories/${c.id}/`, { method: "PATCH", body: JSON.stringify(c) })
      : mockRequest(c, 200);
  },
  async deleteCategory(id: string): Promise<void> {
    if (USE_API) await request<void>(`/menu/categories/${id}/`, { method: "DELETE" });
  },
  async createProduct(p: Product): Promise<Product> {
    return USE_API
      ? normalizeProduct(await request<Product>("/menu/products/", { method: "POST", body: JSON.stringify(p) }))
      : mockRequest(p, 200);
  },
  async updateProduct(p: Product): Promise<Product> {
    return USE_API
      ? normalizeProduct(await request<Product>(`/menu/products/${p.id}/`, { method: "PATCH", body: JSON.stringify(p) }))
      : mockRequest(p, 200);
  },
  async deleteProduct(id: string): Promise<void> {
    if (USE_API) await request<void>(`/menu/products/${id}/`, { method: "DELETE" });
  },
};
