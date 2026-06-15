import type { Category, Product } from "@/types";
import { CATEGORIES, PRODUCTS } from "@/mock/menu";
import { mockRequest } from "./http";

export const menuService = {
  /** GET /api/v1/menu/categories/ */
  async getCategories(): Promise<Category[]> {
    return mockRequest(CATEGORIES, 400);
  },
  /** GET /api/v1/menu/products/ */
  async getProducts(): Promise<Product[]> {
    return mockRequest(PRODUCTS, 500);
  },
};
