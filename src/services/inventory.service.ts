import type { InventoryItem, InventoryMovement, PhysicalCount } from "@/types";
import { INVENTORY } from "@/mock/datasets";
import { MOVEMENTS, PHYSICAL_COUNTS } from "@/mock/kardex";
import { USE_API, request, mockRequest } from "./http";

export const inventoryService = {
  async getItems(): Promise<InventoryItem[]> {
    return USE_API ? request<InventoryItem[]>("/inventory/") : mockRequest(INVENTORY, 600);
  },
  async getMovements(): Promise<InventoryMovement[]> {
    return USE_API ? request<InventoryMovement[]>("/inventory/movements/") : mockRequest(MOVEMENTS, 500);
  },
  async getPhysicalCounts(): Promise<PhysicalCount[]> {
    if (!USE_API) return mockRequest(PHYSICAL_COUNTS, 500);
    return request<PhysicalCount[]>("/inventory/physical-count/").catch(() => []);
  },
  async createItem(item: InventoryItem): Promise<InventoryItem> {
    return USE_API
      ? request<InventoryItem>("/inventory/", { method: "POST", body: JSON.stringify(item) })
      : mockRequest(item, 200);
  },
  async updateItem(item: InventoryItem): Promise<InventoryItem> {
    return USE_API
      ? request<InventoryItem>(`/inventory/${item.id}/`, { method: "PATCH", body: JSON.stringify(item) })
      : mockRequest(item, 200);
  },
  async deleteItem(id: string): Promise<void> {
    if (USE_API) await request<void>(`/inventory/${id}/`, { method: "DELETE" });
  },
  /** Ajuste de stock post-venta: envía el nuevo nivel al backend para sync. */
  async adjustStock(id: string, newStock: number, reason: string): Promise<InventoryItem> {
    return USE_API
      ? request<InventoryItem>(`/inventory/${id}/adjust/`, {
          method: "POST",
          body: JSON.stringify({ stock: newStock, reason }),
        })
      : mockRequest({ id } as InventoryItem, 100);
  },
};
