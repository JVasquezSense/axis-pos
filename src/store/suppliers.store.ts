import { create } from "zustand";
import type { Supplier, Purchase, PurchaseLine } from "@/types";
import { SUPPLIERS } from "@/mock/suppliers";
import { useInventoryStore } from "./inventory.store";
import { USE_API, apiErrorHandler } from "@/services/http";
import { suppliersService } from "@/services/suppliers.service";

interface SuppliersState {
  suppliers: Supplier[];
  purchases: Purchase[];
  seq: number;
  load: () => Promise<void>;
  addSupplier: (s: Supplier) => void;
  updateSupplier: (s: Supplier) => void;
  removeSupplier: (id: string) => void;
  registerPurchase: (supplier: Supplier, lines: PurchaseLine[], invoicePhoto?: string) => void;
}

export const useSuppliersStore = create<SuppliersState>()((set, get) => ({
  suppliers: USE_API ? [] : structuredClone(SUPPLIERS),
  purchases: [],
  seq: 2001,

  load: async () => {
    if (!USE_API) return;
    const [suppliers, purchases] = await Promise.all([
      suppliersService.getSuppliers(),
      suppliersService.getPurchases(),
    ]);
    set({ suppliers, purchases });
  },

  addSupplier: (s) => {
    set((st) => ({ suppliers: [s, ...st.suppliers] }));
    if (USE_API) suppliersService.createSupplier(s).then((saved) =>
      set((st) => ({ suppliers: st.suppliers.map((x) => (x.id === s.id ? saved : x)) }))
    ).catch(apiErrorHandler("proveedor"));
  },

  updateSupplier: (s) => {
    set((st) => ({ suppliers: st.suppliers.map((x) => (x.id === s.id ? s : x)) }));
    if (USE_API) suppliersService.updateSupplier(s).catch(apiErrorHandler("proveedor"));
  },

  removeSupplier: (id) => {
    set((st) => ({ suppliers: st.suppliers.filter((s) => s.id !== id) }));
    if (USE_API) suppliersService.deleteSupplier(id).catch(apiErrorHandler("eliminar proveedor"));
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
      suppliersService.createPurchase({
        code,
        supplierId: supplier.id,
        total,
        lines,
        invoicePhoto,
      }).then((saved) =>
        set((st) => ({ purchases: st.purchases.map((p) => (p.id === purchase.id ? { ...saved } : p)) }))
      ).catch(apiErrorHandler("registrar compra"));
    } else {
      useInventoryStore.getState().addPurchase(
        `${code} · ${supplier.name}`,
        lines.map((l) => ({ inventoryId: l.inventoryId, quantity: l.quantity, unitCost: l.unitCost }))
      );
    }
  },
}));

export function uid(prefix = "id"): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function emptySupplier(): Supplier {
  return { id: uid("s"), name: "", contact: "", phone: "", email: "", category: "Abarrotes", nit: "", active: true };
}
