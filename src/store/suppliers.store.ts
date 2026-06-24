import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Supplier, Purchase, PurchaseLine } from "@/types";
import { SUPPLIERS } from "@/mock/suppliers";
import { useInventoryStore } from "./inventory.store";
import { USE_API } from "@/services/http";
import { suppliersService } from "@/services/suppliers.service";

interface SuppliersState {
  suppliers: Supplier[];
  purchases: Purchase[];
  seq: number;
  addSupplier: (s: Supplier) => void;
  updateSupplier: (s: Supplier) => void;
  removeSupplier: (id: string) => void;
  registerPurchase: (supplier: Supplier, lines: PurchaseLine[], invoicePhoto?: string) => void;
}

export const useSuppliersStore = create<SuppliersState>()(
  persist(
    (set, get) => ({
      suppliers: USE_API ? [] : structuredClone(SUPPLIERS),
      purchases: [],
      seq: 2001,

      addSupplier: (s) => {
        set((st) => ({ suppliers: [s, ...st.suppliers] }));
        if (USE_API) suppliersService.createSupplier(s).then((saved) =>
          set((st) => ({ suppliers: st.suppliers.map((x) => (x.id === s.id ? saved : x)) }))
        ).catch(console.error);
      },

      updateSupplier: (s) => {
        set((st) => ({ suppliers: st.suppliers.map((x) => (x.id === s.id ? s : x)) }));
        if (USE_API) suppliersService.updateSupplier(s).catch(console.error);
      },

      removeSupplier: (id) => {
        set((st) => ({ suppliers: st.suppliers.filter((s) => s.id !== id) }));
        if (USE_API) suppliersService.deleteSupplier(id).catch(console.error);
      },

      registerPurchase: (supplier, lines, invoicePhoto) => {
        const code = `OC-${get().seq}`;
        const total = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
        const purchase: Purchase = {
          id: `purchase-${Date.now()}`,
          code,
          supplierId: supplier.id,
          supplierName: supplier.name,
          date: "Hoy",
          lines,
          total,
          ...(invoicePhoto ? { invoicePhoto } : {}),
        };
        set((st) => ({ purchases: [purchase, ...st.purchases].slice(0, 50), seq: st.seq + 1 }));

        if (USE_API) {
          // Backend crea el purchase Y actualiza el inventario automáticamente
          suppliersService.createPurchase({
            code,
            supplierId: supplier.id,
            total,
            lines,
            invoicePhoto,
          }).then((saved) =>
            set((st) => ({ purchases: st.purchases.map((p) => (p.id === purchase.id ? { ...saved } : p)) }))
          ).catch(console.error);
        } else {
          // Sin backend: actualizar inventario local
          useInventoryStore.getState().addPurchase(
            `${code} · ${supplier.name}`,
            lines.map((l) => ({ inventoryId: l.inventoryId, quantity: l.quantity, unitCost: l.unitCost }))
          );
        }
      },
    }),
    { name: "axis-suppliers", version: 2 }
  )
);

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function emptySupplier(): Supplier {
  return { id: uid("s"), name: "", contact: "", phone: "", email: "", category: "Abarrotes", nit: "", active: true };
}
