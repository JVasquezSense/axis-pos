import { create } from "zustand";
import type { OrderLine, Product, ModifierOption, OrderChannel } from "@/types";
import { USE_API, apiErrorHandler } from "@/services/http";
import { ordersService } from "@/services/orders.service";
import { useKitchenStore } from "./kitchen.store";

interface OrderState {
  tableNumber: number | null;
  lines: OrderLine[];
  tableOrders: Record<string, OrderLine[]>;
  /** Ids reales de Order en el backend que componen la cuenta actual (para marcarlos "paid" al cobrar). */
  activeOrderIds: string[];
  tip: number;
  discount: number;
  setTable: (n: number | null) => void;
  /** Carga la cuenta real de una mesa desde el backend (sobrevive recarga y multi-dispositivo). */
  loadTableOrder: (n: number) => Promise<void>;
  addProduct: (product: Product, modifiers?: ModifierOption[], notes?: string, variationId?: string) => void;
  increment: (lineId: string) => void;
  decrement: (lineId: string) => void;
  setNotes: (lineId: string, notes: string) => void;
  remove: (lineId: string) => void;
  setTip: (v: number) => void;
  setDiscount: (v: number) => void;
  flushToTable: () => void;
  /** Envía el pedido actual a cocina: crea el Order real en el backend (o el ticket local en modo mock). */
  sendToKitchen: (channel: OrderChannel) => Promise<{ id: string; code: string }>;
  /** Marca como pagados los Order reales que componen la cuenta actual. */
  markPaid: () => Promise<void>;
  /** Backlog #4: guarda los cambios de una orden ya enviada (modo edición). */
  saveOrderChanges: () => Promise<void>;
  clear: () => void;
}

const lineTotal = (l: OrderLine) =>
  (l.unitPrice + l.modifiers.reduce((s, m) => s + m.price, 0)) * l.quantity;

// Última llamada a loadTableOrder gana: si dos mesas se cargan casi a la vez
// (p. ej. se abrió el cajón de la 7 y luego se cobró la 1), la petición de la
// 7 puede resolver después y pisar el estado con la mesa equivocada.
let loadTableOrderSeq = 0;

/**
 * Reparte las líneas del ticket entre las órdenes activas de la mesa.
 *
 * El POS muestra una mesa con varias rondas como un solo ticket, pero cada
 * línea pertenece a la orden en la que se envió. Guardarlas todas en la primera
 * dejaba los productos de las demás duplicados (en la primera y en la suya), y
 * el inventario se descontaba dos veces. Lo agregado en el POS todavía no tiene
 * orden: va a la primera, que es la que el usuario ve como "la cuenta".
 */
export function groupLinesByOrder(activeOrderIds: string[], lines: OrderLine[]): Map<string, OrderLine[]> {
  const [firstId] = activeOrderIds;

  // Un carrito donde NINGUNA línea sabe de qué orden viene (se armó antes de
  // que se guardara el origen, o son todas nuevas del POS) no permite saber si
  // las demás órdenes quedaron vacías porque el mesero las borró o porque el
  // dato no está. Ante la duda no se tocan: vaciar una orden borra sus líneas
  // y le devuelve el inventario, y eso no se puede deshacer.
  if (!lines.some((l) => l.orderId)) {
    return new Map([[firstId, [...lines]]]);
  }

  // Con el origen conocido sí se guarda vacía la que perdió sus productos.
  const byOrder = new Map<string, OrderLine[]>(activeOrderIds.map((id) => [id, []]));
  lines.forEach((l) => {
    const target = l.orderId && byOrder.has(l.orderId) ? l.orderId : firstId;
    byOrder.get(target)!.push(l);
  });
  return byOrder;
}

export const useOrderStore = create<OrderState>()((set, get) => ({
  tableNumber: null,
  lines: [],
  tableOrders: {},
  activeOrderIds: [],
  tip: 0,
  discount: 0,

  setTable: (n) =>
    set((s) => {
      const saved: Record<string, OrderLine[]> = { ...s.tableOrders };
      if (s.tableNumber !== null && s.tableNumber !== n) {
        saved[String(s.tableNumber)] = s.lines;
      }
      const nextLines = n !== null ? (saved[String(n)] ?? []) : [];
      return { tableNumber: n, tableOrders: saved, lines: nextLines, activeOrderIds: [] };
    }),

  loadTableOrder: async (n) => {
    if (!USE_API) {
      get().setTable(n);
      return;
    }
    const seq = ++loadTableOrderSeq;
    try {
      const orders = await ordersService.getActive(n);
      // Llegó una petición más nueva mientras esta estaba en vuelo: se descarta.
      if (seq !== loadTableOrderSeq) return;
      const lines: OrderLine[] = orders.flatMap((o) =>
        o.lines.map((l) => ({
          id: `${o.id}-${l.id}`,
          product: l.product,
          quantity: l.quantity,
          modifiers: [],
          notes: l.notes,
          unitPrice: l.unitPrice,
          // Sin esto, al editar la cuenta se perdía la variación y el
          // servidor descontaba el insumo estándar.
          variationId: (l as { variationId?: string }).variationId || undefined,
          // De qué orden viene, para devolvérsela al guardar (ver saveOrderChanges).
          orderId: String(o.id),
        }))
      );
      set({ tableNumber: n, lines, activeOrderIds: orders.map((o) => String(o.id)) });
    } catch {
      if (seq !== loadTableOrderSeq) return;
      // Sin conexión: cae al último estado local conocido para no bloquear al usuario.
      get().setTable(n);
    }
  },

  addProduct: (product, modifiers = [], notes, variationId) =>
    set((state) => {
      const sig = `${product.id}-${modifiers.map((m) => m.id).join(",")}-${notes ?? ""}-${variationId ?? ""}`;
      const existing = state.lines.find(
        (l) => `${l.product.id}-${l.modifiers.map((m) => m.id).join(",")}-${l.notes ?? ""}-${l.variationId ?? ""}` === sig
      );
      if (existing) {
        return {
          lines: state.lines.map((l) =>
            l.id === existing.id ? { ...l, quantity: l.quantity + 1 } : l
          ),
        };
      }
      return {
        lines: [
          ...state.lines,
          {
            id: `${sig}-${Date.now()}`,
            product,
            quantity: 1,
            modifiers,
            variationId,
            notes,
            unitPrice: product.price,
          },
        ],
      };
    }),

  increment: (lineId) =>
    set((s) => ({
      lines: s.lines.map((l) => (l.id === lineId ? { ...l, quantity: l.quantity + 1 } : l)),
    })),

  decrement: (lineId) =>
    set((s) => ({
      lines: s.lines
        .map((l) => (l.id === lineId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0),
    })),

  setNotes: (lineId, notes) =>
    set((s) => ({ lines: s.lines.map((l) => (l.id === lineId ? { ...l, notes } : l)) })),

  remove: (lineId) => set((s) => ({ lines: s.lines.filter((l) => l.id !== lineId) })),
  setTip: (v) => set({ tip: v }),
  setDiscount: (v) => set({ discount: v }),

  flushToTable: () =>
    set((s) => {
      if (s.tableNumber === null) return { lines: [] };
      const existing = s.tableOrders[String(s.tableNumber)] ?? [];
      const merged = [...existing];
      s.lines.forEach((line) => {
        const sig = `${line.product.id}-${line.modifiers.map((m) => m.id).join(",")}-${line.notes ?? ""}`;
        const idx = merged.findIndex(
          (l) => `${l.product.id}-${l.modifiers.map((m) => m.id).join(",")}-${l.notes ?? ""}` === sig
        );
        if (idx >= 0) {
          merged[idx] = { ...merged[idx], quantity: merged[idx].quantity + line.quantity };
        } else {
          merged.push(line);
        }
      });
      return { lines: [], tableOrders: { ...s.tableOrders, [String(s.tableNumber)]: merged } };
    }),

  sendToKitchen: async (channel) => {
    const { lines, tableNumber } = get();
    if (USE_API) {
      const code = `OC-${Date.now().toString(36).toUpperCase()}`;
      const payload = {
        code,
        channel,
        table: tableNumber,
        lines: lines.map((l) => ({
          productId: Number(l.product.id),
          quantity: l.quantity,
          unitPrice: Number((Number(l.unitPrice) + l.modifiers.reduce((s, m) => s + Number(m.price), 0)).toFixed(2)),
          notes: [...l.modifiers.map((m) => m.name), l.notes].filter(Boolean).join(" · ") || undefined,
          variationId: l.variationId || "",
        })),
      };
      const saved = await ordersService.createOrder(payload);
      get().flushToTable();
      return { id: String(saved.id), code: saved.code };
    }
    const ticket = useKitchenStore.getState().addFromOrder(lines, tableNumber, channel);
    get().flushToTable();
    return { id: ticket.id, code: ticket.code };
  },

  markPaid: async () => {
    const { activeOrderIds } = get();
    if (!USE_API || activeOrderIds.length === 0) return;
    await Promise.all(
      activeOrderIds.map((id) => ordersService.updateStatus(id, "paid").catch(apiErrorHandler("cerrar pedido")))
    );
  },

  saveOrderChanges: async () => {
    // Backlog #4: persiste las líneas editadas de una orden ya enviada.
    //
    // Una mesa puede tener varias órdenes activas (rondas sucesivas) y el POS
    // las muestra como un solo ticket. Cada línea vuelve a SU orden: mandarlas
    // todas a la primera dejaba sus productos duplicados (en la primera y en la
    // suya), y el inventario se descontaba dos veces.
    const { activeOrderIds, lines } = get();
    if (!USE_API || activeOrderIds.length === 0) return;

    const toPayload = (l: OrderLine) => ({
      productId: Number(l.product.id),
      quantity: l.quantity,
      unitPrice: Number((Number(l.unitPrice) + l.modifiers.reduce((s, m) => s + Number(m.price), 0)).toFixed(2)),
      notes: [...l.modifiers.map((m) => m.name), l.notes].filter(Boolean).join(" · ") || undefined,
      variationId: l.variationId || "",
    });

    await Promise.all(
      [...groupLinesByOrder(activeOrderIds, lines)].map(([orderId, orderLines]) =>
        ordersService.updateLines(orderId, orderLines.map(toPayload))
      )
    );
  },

  clear: () =>
    set((s) => {
      const tableOrders = { ...s.tableOrders };
      if (s.tableNumber !== null) delete tableOrders[String(s.tableNumber)];
      return { lines: [], tip: 0, discount: 0, tableNumber: null, tableOrders, activeOrderIds: [] };
    }),
}));

export const orderSelectors = {
  subtotal: (lines: OrderLine[]) => lines.reduce((s, l) => s + lineTotal(l), 0),
  count: (lines: OrderLine[]) => lines.reduce((s, l) => s + l.quantity, 0),
  lineTotal,
};
