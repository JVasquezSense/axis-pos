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
import { useAuthStore } from "@/store/auth.store";

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
  const connectRealtime = useMenuStore((s) => s.connectRealtime);
  const tenantId = useAuthStore((s) => s.tenantId);

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
    ]).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Disponibilidad de productos ("Agotado") en tiempo real vía WebSocket.
  useEffect(() => {
    if (!USE_API || !tenantId) return;
    return connectRealtime(tenantId);
  }, [connectRealtime, tenantId]);

  return <>{children}</>;
}
