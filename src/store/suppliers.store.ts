import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Supplier, Purchase, PurchaseLine } from "@/types";
import { SUPPLIERS } from "@/mock/suppliers";
import { useInventoryStore } from "./inventory.store";

interface SuppliersState {
  suppliers: Supplier[];
  purchases: Purchase[];
  seq: number;
  addSupplier: (s: Supplier) => void;
  updateSupplier: (s: Supplier) => void;
  removeSupplier: (id: string) => void;
  /** Registra una compra: guarda el historial y suma stock al inventario (kardex). */
  registerPurchase: (supplier: Supplier, lines: PurchaseLine[]) => void;
}

export const useSuppliersStore = create<SuppliersState>()(
  persist(
    (set, get) => ({
      suppliers: structuredClone(SUPPLIERS),
      purchases: [],
      seq: 2001,
      addSupplier: (s) => set((st) => ({ suppliers: [s, ...st.suppliers] })),
      updateSupplier: (s) => set((st) => ({ suppliers: st.suppliers.map((x) => (x.id === s.id ? s : x)) })),
      removeSupplier: (id) => set((st) => ({ suppliers: st.suppliers.filter((s) => s.id !== id) })),
      registerPurchase: (supplier, lines) => {
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
        };
        set((st) => ({ purchases: [purchase, ...st.purchases].slice(0, 30), seq: st.seq + 1 }));
        // Suma al inventario y genera entradas en el kardex
        useInventoryStore.getState().addPurchase(`${code} · ${supplier.name}`, lines.map((l) => ({ inventoryId: l.inventoryId, quantity: l.quantity, unitCost: l.unitCost })));
      },
    }),
    { name: "axis-suppliers", version: 1 }
  )
);

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function emptySupplier(): Supplier {
  return { id: uid("s"), name: "", contact: "", phone: "", email: "", category: "Abarrotes", nit: "", active: true };
}
