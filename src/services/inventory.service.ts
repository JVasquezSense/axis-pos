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
    return USE_API ? request<PhysicalCount[]>("/inventory/physical-count/") : mockRequest(PHYSICAL_COUNTS, 500);
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
