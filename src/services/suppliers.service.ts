import type { Supplier, Purchase, PurchaseLine } from "@/types";
import { USE_API, request, mockRequest } from "./http";

export interface CreatePurchasePayload {
  code: string;
  supplierId: string;
  subtotal?: number;
  taxTotal?: number;
  total: number;
  lines: PurchaseLine[];
  invoicePhoto?: string;
}

export const suppliersService = {
  async getSuppliers(): Promise<Supplier[]> {
    return USE_API ? request<Supplier[]>("/suppliers/") : mockRequest([], 400);
  },
  async createSupplier(s: Omit<Supplier, "id">): Promise<Supplier> {
    return USE_API
      ? request<Supplier>("/suppliers/", { method: "POST", body: JSON.stringify(s) })
      : mockRequest({ ...s, id: `s-${Date.now()}` } as Supplier, 200);
  },
  async updateSupplier(s: Supplier): Promise<Supplier> {
    return USE_API
      ? request<Supplier>(`/suppliers/${s.id}/`, { method: "PATCH", body: JSON.stringify(s) })
      : mockRequest(s, 200);
  },
  async deleteSupplier(id: string): Promise<void> {
    if (USE_API) await request<void>(`/suppliers/${id}/`, { method: "DELETE" });
  },
  async getPurchases(): Promise<Purchase[]> {
    return USE_API ? request<Purchase[]>("/purchases/") : mockRequest([], 400);
  },
  async createPurchase(payload: CreatePurchasePayload): Promise<Purchase> {
    return USE_API
      ? request<Purchase>("/purchases/", { method: "POST", body: JSON.stringify(payload) })
      : mockRequest({ id: `p-${Date.now()}`, ...payload } as unknown as Purchase, 200);
  },
};
