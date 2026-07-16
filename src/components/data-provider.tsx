"use client";

import { useEffect, useRef } from "react";
import { USE_API } from "@/services/http";
import { useMenuStore } from "@/store/menu.store";
import { useInventoryStore } from "@/store/inventory.store";
import { useRecipesStore } from "@/store/recipes.store";
import { useTablesStore } from "@/store/tables.store";
import { useSuppliersStore } from "@/store/suppliers.store";
import { useSalesStore } from "@/store/sales.store";
import { useReservationsStore } from "@/store/reservations.store";
import { useEmployeesStore } from "@/store/employees.store";
import { startBackgroundSync, stopBackgroundSync } from "@/services/backend-sync";

export function DataProvider({ children }: { children: React.ReactNode }) {
  const loaded = useRef(false);

  const loadMenu = useMenuStore((s) => s.load);
  const loadInventory = useInventoryStore((s) => s.load);
  const loadRecipes = useRecipesStore((s) => s.load);
  const loadTables = useTablesStore((s) => s.load);
  const loadSuppliers = useSuppliersStore((s) => s.load);
  const loadSales = useSalesStore((s) => s.load);
  const loadReservations = useReservationsStore((s) => s.load);
  const loadEmployees = useEmployeesStore((s) => s.load);

  useEffect(() => {
    if (loaded.current || !USE_API) return;
    loaded.current = true;

    Promise.all([
      loadMenu(),
      loadInventory(),
      loadRecipes(),
      loadTables(),
      loadSuppliers(),
      loadSales(),
      loadReservations(),
      loadEmployees(),
    ]).then(() => {
      startBackgroundSync();
    }).catch(console.error);

    return () => stopBackgroundSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
