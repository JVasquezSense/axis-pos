import type { InventoryItem } from "@/types";
import { INVENTORY } from "@/mock/datasets";
import { mockRequest } from "./http";

export const inventoryService = {
  /** GET /api/v1/inventory/ */
  async getItems(): Promise<InventoryItem[]> {
    return mockRequest(INVENTORY, 600);
  },
};
