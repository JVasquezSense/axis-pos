import type { InventoryItem, InventoryMovement, PhysicalCount } from "@/types";
import { INVENTORY } from "@/mock/datasets";
import { MOVEMENTS, PHYSICAL_COUNTS } from "@/mock/kardex";
import { mockRequest } from "./http";

export const inventoryService = {
  /** GET /api/v1/inventory/ */
  async getItems(): Promise<InventoryItem[]> {
    return mockRequest(INVENTORY, 600);
  },
  /** GET /api/v1/inventory/movements/ (kardex) */
  async getMovements(): Promise<InventoryMovement[]> {
    return mockRequest(MOVEMENTS, 500);
  },
  /** GET /api/v1/inventory/physical-count/ */
  async getPhysicalCounts(): Promise<PhysicalCount[]> {
    return mockRequest(PHYSICAL_COUNTS, 500);
  },
};
