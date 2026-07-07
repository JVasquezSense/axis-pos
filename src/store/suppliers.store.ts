import { create } from "zustand";
import type { Supplier, Purchase, PurchaseLine } from "@/types";
import { SUPPLIERS } from "@/mock/suppliers";
import { useInventoryStore } from "./inventory.store";
import { USE_API, apiErrorHandler } from "@/services/http";
import { suppliersService } from "@/services/suppliers.service";
import { useAuditStore } from "./audit.store";

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
    useAuditStore.getState().log({ action: "Proveedor creado", details: `${s.name} · ${s.category}`, user: "Sistema", module: "proveedores" });
    if (USE_API) suppliersService.createSupplier(s).then((saved) =>
      set((st) => ({ suppliers: st.suppliers.map((x) => (x.id === s.id ? saved : x)) }))
    ).catch(apiErrorHandler("proveedor"));
  },

  updateSupplier: (s) => {
    set((st) => ({ suppliers: st.suppliers.map((x) => (x.id === s.id ? s : x)) }));
    useAuditStore.getState().log({ action: "Proveedor actualizado", details: s.name, user: "Sistema", module: "proveedores" });
    if (USE_API) suppliersService.updateSupplier(s).catch(apiErrorHandler("proveedor"));
  },

  removeSupplier: (id) => {
    const name = get().suppliers.find((s) => s.id === id)?.name ?? id;
    set((st) => ({ suppliers: st.suppliers.filter((s) => s.id !== id) }));
    useAuditStore.getState().log({ action: "Proveedor eliminado", details: name, user: "Sistema", module: "proveedores" });
    if (USE_API) suppliersService.deleteSupplier(id).catch(apiErrorHandler("eliminar proveedor"));
  },

  registerPurchase: (supplier, lines, invoicePhoto) => {
    const code = `OC-${get().seq}`;
    const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
    const taxTotal = lines.reduce((s, l) => s + l.quantity * l.unitCost * ((l.taxRate ?? 0) / 100), 0);
    const total = subtotal + taxTotal;
    const purchase: Purchase = {
      id: `purchase-${Date.now()}`,
      code,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: "Hoy",
      lines,
      subtotal,
      taxTotal,
      total,
      ...(invoicePhoto ? { invoicePhoto } : {}),
    };
    set((st) => ({ purchases: [purchase, ...st.purchases].slice(0, 50), seq: st.seq + 1 }));
    useAuditStore.getState().log({ action: "Compra registrada", details: `${code} · ${supplier.name} · $${total.toFixed(0)}`, user: "Sistema", module: "proveedores" });

    if (USE_API) {
      suppliersService.createPurchase({
        code,
        supplierId: supplier.id,
        subtotal,
        taxTotal,
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
