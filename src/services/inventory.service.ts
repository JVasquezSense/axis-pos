import type { InventoryItem, InventoryMovement, PhysicalCount } from "@/types";
import { INVENTORY } from "@/mock/datasets";
import { MOVEMENTS, PHYSICAL_COUNTS } from "@/mock/kardex";
import { USE_API, request, mockRequest } from "./http";

export const inventoryService = {
  /** GET /api/v1/inventory/ */
  async getItems(): Promise<InventoryItem[]> {
    return USE_API ? request<InventoryItem[]>("/inventory/") : mockRequest(INVENTORY, 600);
  },
  /** GET /api/v1/inventory/movements/ (kardex) */
  async getMovements(): Promise<InventoryMovement[]> {
    return USE_API ? request<InventoryMovement[]>("/inventory/movements/") : mockRequest(MOVEMENTS, 500);
  },
  /** GET /api/v1/inventory/physical-count/ */
  async getPhysicalCounts(): Promise<PhysicalCount[]> {
    return USE_API ? request<PhysicalCount[]>("/inventory/physical-count/") : mockRequest(PHYSICAL_COUNTS, 500);
  },
};
