import type { AiAction } from "@/app/api/ai/action/route";
import type { InventoryItem, Product, PurchaseLine, Recipe } from "@/types";
import { useInventoryStore, statusFor } from "@/store/inventory.store";
import { useMenuStore, uid } from "@/store/menu.store";
import { useRecipesStore, emptyRecipe } from "@/store/recipes.store";
import { useSuppliersStore } from "@/store/suppliers.store";
import { useOrderStore } from "@/store/order.store";
import { useTablesStore } from "@/store/tables.store";
import { menuService } from "@/services/menu.service";
import { USE_API } from "@/services/http";
import { matchProduct, normalize, singularize } from "@/lib/voice-order";
import { alignToItemUnit } from "@/lib/recipes";
import { formatCurrency, formatDate } from "@/lib/utils";

/**
 * Ejecución de las acciones que pide el usuario al asistente.
 *
 * El modelo solo propone (por nombre); aquí se resuelve contra los datos reales
 * del restaurante, se arma un resumen para que el usuario confirme y, solo
 * entonces, se escribe. Nada se guarda sin ese sí.
 */

/** Busca por nombre, tolerando plurales y diferencias de tildes o mayúsculas. */
function findByName<T extends { name: string }>(list: T[], name: string): T | undefined {
  const q = normalize(name);
  const s = singularize(name);
  return (
    list.find((x) => normalize(x.name) === q) ??
    list.find((x) => normalize(x.name) === s) ??
    list.find((x) => normalize(x.name).includes(q) || q.includes(normalize(x.name)))
  );
}

export interface ActionPlan {
  /** Título de la tarjeta de confirmación. */
  title: string;
  /** Líneas de detalle: lo que va a pasar, en cristiano. */
  details: string[];
  /** Avisos que no impiden ejecutar (p. ej. insumos que se crearán). */
  warnings: string[];
  /** Motivo por el que no se puede ejecutar; si viene, no hay confirmación. */
  blocked?: string;
  run: () => Promise<string>;
}

/** Contexto que se le pasa al modelo para que use nombres reales. */
export function actionContext(): string {
  const items = useInventoryStore.getState().items.map((i) => i.name);
  const products = useMenuStore.getState().products.map((p) => p.name);
  const suppliers = useSuppliersStore.getState().suppliers.map((s) => s.name);
  const tables = useTablesStore.getState().tables.map((t) => t.number);
  const zones = useTablesStore.getState().zones.map((z) => z.name);
  return [
    items.length ? `Insumos: ${items.slice(0, 120).join(", ")}` : "Insumos: (ninguno)",
    products.length ? `Productos: ${products.slice(0, 120).join(", ")}` : "Productos: (ninguno)",
    suppliers.length ? `Proveedores: ${suppliers.join(", ")}` : "Proveedores: (ninguno)",
    tables.length ? `Mesas: ${tables.join(", ")}` : "Mesas: (ninguna)",
    zones.length ? `Zonas del salón: ${zones.join(", ")}` : "",
    `Hoy es ${new Date().toISOString().slice(0, 10)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/** Traduce la acción del modelo a un plan confirmable, o null si no aplica. */
export function planFor(action: AiAction): ActionPlan | null {
  switch (action.action) {
    case "create_inventory_item":
      return planCreateItem(action);
    case "update_inventory_item":
      return planUpdateItem(action);
    case "delete_inventory_item":
      return planDeleteItem(action);
    case "register_purchase":
      return planPurchase(action);
    case "create_recipe":
      return planRecipe(action);
    case "add_order_lines":
      return planOrder(action);
    case "create_table":
      return planTable(action);
    default:
      return null;
  }
}

// ─── Insumos ──────────────────────────────────────────────────────────────────

function planCreateItem(action: AiAction): ActionPlan | null {
  const data = action.item;
  if (!data) return null;
  const items = useInventoryStore.getState().items;
  const existing = findByName(items, data.name);

  const item: InventoryItem = {
    id: uid("inv"),
    name: data.name,
    category: data.category ?? "General",
    stock: data.stock ?? 0,
    unit: data.unit ?? "Und",
    minStock: data.minStock ?? 0,
    cost: data.cost ?? 0,
    supplier: data.supplier ?? "",
    status: statusFor(data.stock ?? 0, data.minStock ?? 0),
    updatedAt: new Date().toISOString(),
  };

  return {
    title: `Crear el insumo ${item.name}`,
    details: [
      `Stock inicial: ${item.stock} ${item.unit}`,
      `Stock mínimo: ${item.minStock} ${item.unit}`,
      `Costo unitario: ${formatCurrency(item.cost)}`,
      `Categoría: ${item.category}`,
    ],
    warnings: existing ? [`Ya tienes un insumo llamado «${existing.name}»: quedarían duplicados.`] : [],
    run: async () => {
      const saved = await useInventoryStore.getState().createItem(item);
      if (!saved) throw new Error("No se pudo crear el insumo");
      return `Insumo **${saved.name}** creado con ${saved.stock} ${saved.unit}.`;
    },
  };
}

function planUpdateItem(action: AiAction): ActionPlan | null {
  const data = action.item;
  if (!data) return null;
  const items = useInventoryStore.getState().items;
  const current = findByName(items, data.name);
  if (!current) {
    return {
      title: `Actualizar ${data.name}`,
      details: [],
      warnings: [],
      blocked: `No encontré «${data.name}» en tu inventario.`,
      run: async () => "",
    };
  }

  const next: InventoryItem = {
    ...current,
    stock: data.stock ?? current.stock,
    minStock: data.minStock ?? current.minStock,
    cost: data.cost ?? current.cost,
    category: data.category ?? current.category,
    supplier: data.supplier ?? current.supplier,
    unit: data.unit ?? current.unit,
    updatedAt: new Date().toISOString(),
  };
  next.status = statusFor(next.stock, next.minStock);

  const details: string[] = [];
  if (next.stock !== current.stock) details.push(`Stock: ${current.stock} → ${next.stock} ${next.unit}`);
  if (next.minStock !== current.minStock) details.push(`Mínimo: ${current.minStock} → ${next.minStock}`);
  if (next.cost !== current.cost) details.push(`Costo: ${formatCurrency(current.cost)} → ${formatCurrency(next.cost)}`);
  if (next.category !== current.category) details.push(`Categoría: ${current.category} → ${next.category}`);
  if (next.supplier !== current.supplier) details.push(`Proveedor: ${current.supplier || "—"} → ${next.supplier || "—"}`);

  if (details.length === 0) {
    return {
      title: `Actualizar ${current.name}`,
      details: [],
      warnings: [],
      blocked: "No entendí qué cambiar. Dime el dato y el valor nuevo.",
      run: async () => "",
    };
  }

  return {
    title: `Actualizar el insumo ${current.name}`,
    details,
    // Cambiar el stock a mano no deja rastro en el kardex, a diferencia de una compra.
    warnings: next.stock !== current.stock
      ? ["Ajustar el stock aquí no genera movimiento de kardex; si es una compra, regístrala como compra."]
      : [],
    run: async () => {
      useInventoryStore.getState().updateItem(next);
      return `**${next.name}** actualizado.`;
    },
  };
}

function planDeleteItem(action: AiAction): ActionPlan | null {
  const data = action.item;
  if (!data) return null;
  const items = useInventoryStore.getState().items;
  const current = findByName(items, data.name);
  if (!current) {
    return {
      title: `Eliminar ${data.name}`,
      details: [],
      warnings: [],
      blocked: `No encontré «${data.name}» en tu inventario.`,
      run: async () => "",
    };
  }

  // Un insumo usado por recetas deja esas fichas sin costear.
  const recipes = useRecipesStore.getState().recipes.filter((r) =>
    r.ingredients.some((ing) => String(ing.inventoryId) === String(current.id))
  );

  return {
    title: `Eliminar el insumo ${current.name}`,
    details: [`Stock actual: ${current.stock} ${current.unit}`],
    warnings: recipes.length
      ? [`Lo usan ${recipes.length} receta${recipes.length > 1 ? "s" : ""} (${recipes.map((r) => r.name).slice(0, 3).join(", ")}): quedarán sin ese costo.`]
      : [],
    run: async () => {
      useInventoryStore.getState().deleteItem(current.id);
      return `Insumo **${current.name}** eliminado.`;
    },
  };
}

// ─── Compras ──────────────────────────────────────────────────────────────────

function planPurchase(action: AiAction): ActionPlan | null {
  const data = action.purchase;
  if (!data) return null;
  const suppliers = useSuppliersStore.getState().suppliers;
  const supplier = findByName(suppliers, data.supplier);
  if (!supplier) {
    return {
      title: "Registrar compra",
      details: [],
      warnings: [],
      blocked: `No tengo al proveedor «${data.supplier}». Créalo en Proveedores y lo registramos.`,
      run: async () => "",
    };
  }

  const inventory = useInventoryStore.getState().items;
  const lines: PurchaseLine[] = [];
  const missing: string[] = [];
  for (const l of data.lines) {
    const item = findByName(inventory, l.name);
    if (!item) {
      missing.push(l.name);
      continue;
    }
    lines.push({
      inventoryId: String(item.id),
      name: item.name,
      unit: item.unit,
      quantity: l.quantity,
      unitCost: l.unitCost || item.cost,
      taxRate: l.taxRate ?? 0,
    });
  }

  if (lines.length === 0) {
    return {
      title: "Registrar compra",
      details: [],
      warnings: [],
      blocked: `No encontré en tu inventario: ${missing.join(", ")}. Créalos primero.`,
      run: async () => "",
    };
  }

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
  const taxTotal = lines.reduce((s, l) => s + l.quantity * l.unitCost * ((l.taxRate ?? 0) / 100), 0);

  const details = [
    `Proveedor: ${supplier.name}`,
    ...lines.map((l) => `${l.quantity} ${l.unit} de ${l.name} a ${formatCurrency(l.unitCost)}`),
    `Total: ${formatCurrency(subtotal + taxTotal)}`,
  ];
  if (data.invoiceNumber) details.push(`Factura ${data.invoiceNumber}`);
  if (data.receivedAt) details.push(`Recibido: ${formatDate(data.receivedAt)}`);
  if (data.dueDate) details.push(`Vence: ${formatDate(data.dueDate)}`);

  return {
    title: `Registrar compra a ${supplier.name}`,
    details,
    warnings: [
      ...(missing.length ? [`Se omiten (no están en inventario): ${missing.join(", ")}.`] : []),
      "Los insumos entran al inventario y quedan en el kardex.",
    ],
    run: async () => {
      useSuppliersStore.getState().registerPurchase(supplier, lines, undefined, {
        invoiceNumber: data.invoiceNumber ?? "",
        receivedAt: data.receivedAt ?? new Date().toISOString().slice(0, 10),
        dueDate: data.dueDate ?? null,
      });
      return `Compra a **${supplier.name}** registrada por ${formatCurrency(subtotal + taxTotal)}.`;
    },
  };
}

// ─── Productos y recetas ──────────────────────────────────────────────────────

function planRecipe(action: AiAction): ActionPlan | null {
  const data = action.recipe;
  if (!data) return null;
  const categories = useMenuStore.getState().categories;
  const inventory = useInventoryStore.getState().items;

  const category = data.category ? findByName(categories, data.category) : undefined;
  const categoryId = String(category?.id ?? categories[0]?.id ?? "");
  if (!categoryId) {
    return {
      title: `Crear ${data.name}`,
      details: [],
      warnings: [],
      blocked: "Primero necesitas al menos una categoría en el menú.",
      run: async () => "",
    };
  }

  const ingredients = (data.ingredients ?? []).map((ing) => {
    const item = findByName(inventory, ing.name);
    return { ...ing, item };
  });
  const unknown = ingredients.filter((i) => !i.item).map((i) => i.name);

  const details = [
    `Precio: ${formatCurrency(data.price ?? 0)}`,
    `Categoría: ${category?.name ?? categories[0]?.name}`,
    `Porciones: ${data.portions ?? 1} · ${data.prepMinutes ?? 10} min`,
  ];
  if (ingredients.length) {
    details.push(
      `Insumos: ${ingredients.filter((i) => i.item).map((i) => `${i.quantity} ${i.unit ?? i.item!.unit} de ${i.item!.name}`).join(", ") || "—"}`
    );
  }

  return {
    title: `Crear el producto ${data.name}`,
    details,
    // Los insumos que no existen no se crean solos: eso llenaba el inventario
    // de cosas que el restaurante nunca registró.
    warnings: unknown.length ? [`No están en tu inventario y se omiten: ${unknown.join(", ")}.`] : [],
    run: async () => {
      const product: Product = {
        id: uid("p"),
        name: data.name,
        description: data.description ?? "",
        price: data.price ?? 0,
        category: categoryId,
        image: "🍽️",
        tags: [],
        available: true,
        prepMinutes: data.prepMinutes ?? 10,
        popular: false,
      };
      const savedProduct = USE_API ? await menuService.createProduct(product) : product;
      if (USE_API) useMenuStore.getState().addProductLocal(savedProduct);
      else useMenuStore.getState().addProduct(savedProduct);

      const recipe: Recipe = {
        ...emptyRecipe(),
        name: data.name,
        description: data.description ?? "",
        category: categoryId,
        price: data.price ?? 0,
        portions: data.portions ?? 1,
        prepMinutes: data.prepMinutes ?? 10,
        status: "active",
        productId: String(savedProduct.id),
        ingredients: ingredients
          .filter((i) => i.item)
          .map((i) => {
            // La unidad la manda el insumo del inventario, no la que propuso la IA.
            const aligned = alignToItemUnit(i.quantity, i.unit, i.item!.unit);
            return {
              id: uid("ing"),
              inventoryId: String(i.item!.id),
              name: i.item!.name,
              unit: aligned.unit,
              quantity: aligned.quantity,
              waste: i.waste ?? 0,
            };
          }),
      };
      useRecipesStore.getState().create(recipe);
      return `Producto **${data.name}** creado con su ficha técnica.`;
    },
  };
}

// ─── Mesas ────────────────────────────────────────────────────────────────────

function planTable(action: AiAction): ActionPlan | null {
  const data = action.table;
  if (!data) return null;
  const { tables, zones } = useTablesStore.getState();

  const count = Math.max(1, Math.min(data.count ?? 1, 20));
  const capacity = data.capacity && data.capacity > 0 ? data.capacity : 4;
  const zone = (data.zone ? findByName(zones, data.zone) : undefined)?.name ?? zones[0]?.name ?? "Salón";

  // Números libres desde el que pidió: crear una mesa 4 cuando ya existe rompe el mapa.
  const taken = new Set(tables.map((t) => t.number));
  const numbers: number[] = [];
  const repeated: number[] = [];
  for (let n = data.number; numbers.length < count && n < data.number + count + 50; n++) {
    if (taken.has(n)) repeated.push(n);
    else numbers.push(n);
  }

  if (numbers.length === 0) {
    return {
      title: "Crear mesas",
      details: [],
      warnings: [],
      blocked: `La mesa ${data.number} ya existe.`,
      run: async () => "",
    };
  }

  return {
    title: numbers.length === 1 ? `Crear la mesa ${numbers[0]}` : `Crear ${numbers.length} mesas`,
    details: [
      `Números: ${numbers.join(", ")}`,
      `Capacidad: ${capacity} personas`,
      `Zona: ${zone}`,
    ],
    warnings: repeated.length ? [`Ya existen y se omiten: mesa ${repeated.join(", ")}.`] : [],
    run: async () => {
      const add = useTablesStore.getState().addTable;
      numbers.forEach((number, i) => {
        add({
          id: uid("t"),
          number,
          capacity,
          status: "available",
          zone,
          // En cuadrícula dentro del mapa, para que no se apilen en el mismo punto.
          x: 12 + ((tables.length + i) % 6) * 14,
          y: 15 + Math.floor((tables.length + i) / 6) * 18,
          shape: "square",
        });
      });
      return numbers.length === 1
        ? `Mesa **${numbers[0]}** creada en ${zone}.`
        : `${numbers.length} mesas creadas en ${zone} (${numbers.join(", ")}).`;
    },
  };
}

// ─── Pedidos ──────────────────────────────────────────────────────────────────

function planOrder(action: AiAction): ActionPlan | null {
  const data = action.order;
  if (!data) return null;
  const products = useMenuStore.getState().products;

  const resolved = data.lines.map((l) => ({
    line: l,
    match: matchProduct(l.name, products) ?? matchProduct(singularize(l.name), products),
  }));
  const found = resolved.filter((r) => r.match);
  const missing = resolved.filter((r) => !r.match).map((r) => r.line.name);
  const soldOut = found.filter((r) => !r.match!.product.available).map((r) => r.match!.product.name);
  const usable = found.filter((r) => r.match!.product.available);

  if (usable.length === 0) {
    return {
      title: "Agregar al pedido",
      details: [],
      warnings: [],
      blocked: missing.length
        ? `No encontré en la carta: ${missing.join(", ")}.`
        : `Todo lo que pediste está agotado: ${soldOut.join(", ")}.`,
      run: async () => "",
    };
  }

  const tables = useTablesStore.getState().tables;
  const table = data.table && tables.some((t) => t.number === data.table) ? data.table : null;

  return {
    title: table ? `Agregar al pedido de la mesa ${table}` : "Agregar al pedido actual",
    details: usable.map(
      (r) => `${r.line.quantity}× ${r.match!.product.name}${r.line.notes ? ` · ${r.line.notes}` : ""}`
    ),
    warnings: [
      ...(missing.length ? [`No están en la carta: ${missing.join(", ")}.`] : []),
      ...(soldOut.length ? [`Agotados, no se agregan: ${soldOut.join(", ")}.`] : []),
      ...(data.table && !table ? [`La mesa ${data.table} no existe: se agrega al pedido actual.`] : []),
      "Queda en el pedido; enviarlo a cocina lo haces tú desde Pedidos.",
    ],
    run: async () => {
      const order = useOrderStore.getState();
      // La mesa primero: cambiarla reemplaza las líneas por la cuenta de esa mesa.
      if (table !== null && table !== order.tableNumber) await order.loadTableOrder(table);
      let added = 0;
      for (const r of usable) {
        for (let i = 0; i < r.line.quantity; i++) {
          useOrderStore.getState().addProduct(r.match!.product, [], r.line.notes);
        }
        added += r.line.quantity;
      }
      return `${added} ítem${added > 1 ? "s" : ""} en el pedido${table ? ` de la mesa ${table}` : ""}.`;
    },
  };
}
