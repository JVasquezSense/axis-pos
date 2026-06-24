import type { Category, Product } from "@/types";
import { CATEGORIES, PRODUCTS } from "@/mock/menu";
import { USE_API, request, mockRequest } from "./http";

export const menuService = {
  async getCategories(): Promise<Category[]> {
    return USE_API ? request<Category[]>("/menu/categories/") : mockRequest(CATEGORIES, 400);
  },
  async getProducts(): Promise<Product[]> {
    return USE_API ? request<Product[]>("/menu/products/") : mockRequest(PRODUCTS, 500);
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
      ? request<Product>("/menu/products/", { method: "POST", body: JSON.stringify(p) })
      : mockRequest(p, 200);
  },
  async updateProduct(p: Product): Promise<Product> {
    return USE_API
      ? request<Product>(`/menu/products/${p.id}/`, { method: "PATCH", body: JSON.stringify(p) })
      : mockRequest(p, 200);
  },
  async deleteProduct(id: string): Promise<void> {
    if (USE_API) await request<void>(`/menu/products/${id}/`, { method: "DELETE" });
  },
};
