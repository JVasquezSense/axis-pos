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

/**
 * Hidrata todos los stores desde el backend cuando USE_API=true.
 * Llamar una sola vez desde el AppShell.
 */
export function useAppInit() {
  useEffect(() => {
    if (!USE_API) return;

    // Menú
    menuService.getCategories().then((categories) => useMenuStore.setState({ categories })).catch(console.error);
    menuService.getProducts().then((products) => useMenuStore.setState({ products })).catch(console.error);

    // Inventario
    inventoryService.getItems().then((items) => useInventoryStore.setState({ items })).catch(console.error);
    inventoryService.getMovements().then((movements) => useInventoryStore.setState({ movements })).catch(console.error);

    // Recetas
    recipesService.list().then((recipes) => useRecipesStore.setState({ recipes })).catch(console.error);

    // Mesas
    salonService.getTables().then((tables) => useTablesStore.setState({ tables })).catch(console.error);

    // Proveedores
    suppliersService.getSuppliers().then((suppliers) => useSuppliersStore.setState({ suppliers })).catch(console.error);
    suppliersService.getPurchases().then((purchases) => useSuppliersStore.setState({ purchases })).catch(console.error);

    // Reservaciones
    reservationsService.getAll().then((reservations) => useReservationsStore.setState({ reservations })).catch(console.error);

    // Ventas del día (para Axis IA y dashboard)
    salesService.getAll().then((records) => useSalesStore.setState({ records })).catch(console.error);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
