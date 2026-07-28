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
import { useAuditStore } from "@/store/audit.store";
import { useDeliveryStore } from "@/store/delivery.store";
import { useAppStore } from "@/store/app.store";
import { meService } from "@/services/me.service";

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
  const loadAudit = useAuditStore((s) => s.load);
  const loadDeliveries = useDeliveryStore((s) => s.load);
  const connectRealtime = useMenuStore((s) => s.connectRealtime);
  const tenantId = useAuthStore((s) => s.tenantId);
  const updateRestaurant = useAppStore((s) => s.updateRestaurant);

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
      loadAudit(),
      loadDeliveries(),
    ]).catch(console.error);

    // Hidrata el restaurante real del usuario. Sin esto, `restaurant.slug`
    // conserva el valor por defecto ("demo-burger") y el QR por mesa y el
    // enlace a la carta pública apuntan a un restaurante inexistente.
    meService.get()
      .then((me) => {
        if (!me?.tenantSlug) return;
        // Solo se envían las claves presentes: pasar `undefined` explícito
        // borraría el valor actual al hacer spread en el store.
        const patch: Record<string, string> = { slug: me.tenantSlug };
        if (me.tenantName) patch.name = me.tenantName;
        if (me.tenantLogo) patch.logo = me.tenantLogo;
        if (me.tenantPlan) patch.plan = me.tenantPlan;
        updateRestaurant(patch);
      })
      .catch(() => { /* sin sesión válida: se conserva lo que haya */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Disponibilidad de productos ("Agotado") en tiempo real vía WebSocket.
  useEffect(() => {
    if (!USE_API || !tenantId) return;
    return connectRealtime(tenantId);
  }, [connectRealtime, tenantId]);

  return <>{children}</>;
}
