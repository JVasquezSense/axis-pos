"use client";

import { useEffect } from "react";
import { USE_API } from "@/services/http";
import { menuService } from "@/services/menu.service";
import { inventoryService } from "@/services/inventory.service";
import { recipesService } from "@/services/recipes.service";
import { salonService } from "@/services/salon.service";
import { suppliersService } from "@/services/suppliers.service";
import { reservationsService } from "@/services/reservations.service";
import { salesService } from "@/services/sales.service";
import { useMenuStore } from "@/store/menu.store";
import { useInventoryStore } from "@/store/inventory.store";
import { useRecipesStore } from "@/store/recipes.store";
import { useTablesStore } from "@/store/tables.store";
import { useSuppliersStore } from "@/store/suppliers.store";
import { useReservationsStore } from "@/store/reservations.store";
import { useSalesStore } from "@/store/sales.store";

/** Garantiza que la respuesta sea un array aunque venga en formato paginado {count, results}. */
function arr<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && "results" in data && Array.isArray((data as { results: unknown }).results))
    return (data as { results: T[] }).results;
  return [];
}

/**
 * Hidrata todos los stores desde el backend cuando USE_API=true.
 * Llamar una sola vez desde el AppShell.
 */
export function useAppInit() {
  useEffect(() => {
    if (!USE_API) return;

    // Menú
    menuService.getCategories().then((r) => useMenuStore.setState({ categories: arr(r) })).catch(console.error);
    menuService.getProducts().then((r) => useMenuStore.setState({ products: arr(r) })).catch(console.error);

    // Inventario
    inventoryService.getItems().then((r) => useInventoryStore.setState({ items: arr(r) })).catch(console.error);
    inventoryService.getMovements().then((r) => useInventoryStore.setState({ movements: arr(r) })).catch(console.error);

    // Recetas
    recipesService.list().then((r) => useRecipesStore.setState({ recipes: arr(r) })).catch(console.error);

    // Mesas
    salonService.getTables().then((r) => useTablesStore.setState({ tables: arr(r) })).catch(console.error);

    // Proveedores
    suppliersService.getSuppliers().then((r) => useSuppliersStore.setState({ suppliers: arr(r) })).catch(console.error);
    suppliersService.getPurchases().then((r) => useSuppliersStore.setState({ purchases: arr(r) })).catch(console.error);

    // Reservaciones
    reservationsService.getAll().then((r) => useReservationsStore.setState({ reservations: arr(r) })).catch(console.error);

    // Ventas del día (para Axis IA y dashboard)
    salesService.getAll().then((r) => useSalesStore.setState({ records: arr(r) })).catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
