import type { InventoryItem, InventoryMovement, PhysicalCount } from "@/types";
import { INVENTORY } from "@/mock/datasets";
import { MOVEMENTS, PHYSICAL_COUNTS } from "@/mock/kardex";
import { USE_API, request, mockRequest } from "./http";

/**
 * DRF serializa los DecimalField como string ("12.000"). Si esos strings entran
 * al store, la aritmetica se rompe silenciosamente: `stock + qty` concatena y
 * `stock < min` compara lexicograficamente. Normalizar en el borde.
 */
function normalizeItem(i: InventoryItem): InventoryItem {
  return {
    ...i,
    stock: Number(i.stock),
    minStock: Number(i.minStock),
    cost: Number(i.cost),
  };
}

export interface DishConsumptionSupply {
  id: string;
  name: string;
  unit: string;
  consumed: number;
  cost: number;
}

export interface DishConsumptionReport {
  period: { from: string; to: string };
  dishes: {
    id: string;
    name: string;
    emoji?: string;
    units: number;
    revenue: number;
    cost?: number;
    /** Desglose de insumos consumidos por este plato (lo calcula el backend). */
    supplies?: DishConsumptionSupply[];
  }[];
  supplies: DishConsumptionSupply[];
}

export const inventoryService = {
  async getItems(): Promise<InventoryItem[]> {
    if (!USE_API) return mockRequest(INVENTORY, 600);
    const items = await request<InventoryItem[]>("/inventory/");
    return items.map(normalizeItem);
  },
  async getMovements(): Promise<InventoryMovement[]> {
    return USE_API ? request<InventoryMovement[]>("/inventory/movements/") : mockRequest(MOVEMENTS, 500);
  },
  /** Salida por Plato (backlog #2): consumo de insumos por plato, filtrado por tenant. */
  async getDishConsumption(days = 30): Promise<DishConsumptionReport> {
    return USE_API
      ? request<DishConsumptionReport>(`/reports/dish-consumption/?days=${days}`)
      : mockRequest({ period: { from: "", to: "" }, dishes: [], supplies: [] } as DishConsumptionReport, 500);
  },
  async getPhysicalCounts(): Promise<PhysicalCount[]> {
    if (!USE_API) return mockRequest(PHYSICAL_COUNTS, 500);
    return request<PhysicalCount[]>("/inventory/physical-count/").catch(() => []);
  },
  async createItem(item: InventoryItem): Promise<InventoryItem> {
    if (!USE_API) return mockRequest(item, 200);
    const saved = await request<InventoryItem>("/inventory/", { method: "POST", body: JSON.stringify(item) });
    return normalizeItem(saved);
  },
  async updateItem(item: InventoryItem): Promise<InventoryItem> {
    if (!USE_API) return mockRequest(item, 200);
    const saved = await request<InventoryItem>(`/inventory/${item.id}/`, { method: "PATCH", body: JSON.stringify(item) });
    return normalizeItem(saved);
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
