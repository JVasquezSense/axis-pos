import { create } from "zustand";
import type { Tax } from "@/types";
import { USE_API, apiErrorHandler } from "@/services/http";
import { taxesService } from "@/services/taxes.service";
import { useAuditStore } from "./audit.store";

/**
 * Impuestos del restaurante.
 *
 * Antes el IVA del 8% vivía en el código y se aplicaba a todo el mundo por
 * igual. Cada negocio liquida lo suyo —un bar suma impuesto al consumo, una
 * cafetería solo INC—, así que el catálogo es del restaurante y se administra
 * desde la carta.
 */
interface TaxesState {
  taxes: Tax[];
  loaded: boolean;
  load: () => Promise<void>;
  add: (tax: Omit<Tax, "id">) => Promise<void>;
  update: (tax: Tax) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export const useTaxesStore = create<TaxesState>()((set, get) => ({
  taxes: [],
  loaded: false,

  load: async () => {
    try {
      const taxes = await taxesService.list();
      set({ taxes, loaded: true });
    } catch (err) {
      set({ loaded: true });
      apiErrorHandler("impuestos")(err);
    }
  },

  add: async (tax) => {
    try {
      const saved = await taxesService.create(tax);
      set((s) => ({ taxes: [...s.taxes, saved] }));
      useAuditStore.getState().log({
        action: "Impuesto creado",
        details: `${saved.name} · ${saved.type === "percent" ? `${saved.rate}%` : `$${saved.rate}`}`,
        user: "Sistema",
        module: "menu",
      });
    } catch (err) {
      apiErrorHandler("crear impuesto")(err);
    }
  },

  update: async (tax) => {
    const previous = get().taxes;
    set((s) => ({ taxes: s.taxes.map((t) => (String(t.id) === String(tax.id) ? tax : t)) }));
    try {
      await taxesService.update(tax);
      useAuditStore.getState().log({
        action: "Impuesto actualizado", details: tax.name, user: "Sistema", module: "menu",
      });
    } catch (err) {
      // Se revierte: dejarlo cambiado en pantalla haría cobrar una tarifa que
      // el servidor no tiene.
      set({ taxes: previous });
      apiErrorHandler("actualizar impuesto")(err);
    }
  },

  remove: async (id) => {
    const previous = get().taxes;
    const gone = previous.find((t) => String(t.id) === String(id));
    set((s) => ({ taxes: s.taxes.filter((t) => String(t.id) !== String(id)) }));
    try {
      await taxesService.remove(id);
      useAuditStore.getState().log({
        action: "Impuesto eliminado", details: gone?.name ?? String(id), user: "Sistema", module: "menu",
      });
    } catch (err) {
      set({ taxes: previous });
      apiErrorHandler("eliminar impuesto")(err);
    }
  },
}));

/** Los que se aplican a un producto que no declara impuestos propios. */
export function defaultTaxes(taxes: Tax[]): Tax[] {
  return taxes.filter((t) => t.active !== false && t.isDefault);
}
