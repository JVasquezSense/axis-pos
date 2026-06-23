import type { Category, Product } from "@/types";
import { CATEGORIES, PRODUCTS } from "@/mock/menu";
import { USE_API, request, mockRequest } from "./http";

export const menuService = {
  /** GET /api/v1/menu/categories/ */
  async getCategories(): Promise<Category[]> {
    return USE_API ? request<Category[]>("/menu/categories/") : mockRequest(CATEGORIES, 400);
  },
  /** GET /api/v1/menu/products/ */
  async getProducts(): Promise<Product[]> {
    return USE_API ? request<Product[]>("/menu/products/") : mockRequest(PRODUCTS, 500);
  },
};
