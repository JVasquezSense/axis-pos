import { describe, it, expect } from "vitest";
import type { InventoryItem, OrderLine, Product, Recipe } from "@/types";
import { remainingUnits, unitDemand, type StockContext } from "./stock";

function item(id: string, stock: number, unit = "und"): InventoryItem {
  return { id, name: id, category: "", unit, stock, minStock: 1, cost: 1000, status: "normal", updatedAt: "" } as InventoryItem;
}

function product(id: string, extra: Partial<Product> = {}): Product {
  return {
    id, name: id, description: "", price: 1000, category: "c", image: "", tags: [],
    available: true, prepMinutes: 0, ...extra,
  } as Product;
}

function line(id: string, p: Product, quantity: number, variationId?: string): OrderLine {
  return { id, product: p, quantity, modifiers: [], unitPrice: p.price, variationId };
}

const recipe = (productId: string, ingredients: Recipe["ingredients"], portions = 1): Recipe =>
  ({ id: `r-${productId}`, productId, portions, ingredients, variations: [] } as unknown as Recipe);

const ing = (inventoryId: string, quantity: number, unit = "und") =>
  ({ id: `i-${inventoryId}`, inventoryId, name: inventoryId, unit, quantity, waste: 0 });

describe("límite de venta por insumos disponibles", () => {
  it("producto simple: las unidades salen del stock de su insumo", () => {
    const botella = product("p1", { kind: "simple", inventoryId: "inv1", inventoryQty: 1 });
    const ctx: StockContext = { items: [item("inv1", 3)], recipes: [], products: [botella] };
    expect(remainingUnits(botella, [], ctx)).toBe(3);
  });

  it("descuenta lo que el carrito ya reservó", () => {
    const botella = product("p1", { kind: "simple", inventoryId: "inv1", inventoryQty: 1 });
    const ctx: StockContext = { items: [item("inv1", 3)], recipes: [], products: [botella] };
    expect(remainingUnits(botella, [line("l1", botella, 2)], ctx)).toBe(1);
    expect(remainingUnits(botella, [line("l1", botella, 3)], ctx)).toBe(0);
  });

  it("respeta inventoryQty: un six-pack descuenta 6", () => {
    const sixpack = product("p1", { kind: "simple", inventoryId: "inv1", inventoryQty: 6 });
    const ctx: StockContext = { items: [item("inv1", 13)], recipes: [], products: [sixpack] };
    expect(remainingUnits(sixpack, [], ctx)).toBe(2);
  });

  it("compuesto: manda el insumo más escaso de la ficha", () => {
    const plato = product("p1", { kind: "compound" });
    const ctx: StockContext = {
      items: [item("carne", 10), item("pan", 3)],
      recipes: [recipe("p1", [ing("carne", 1), ing("pan", 1)])],
      products: [plato],
    };
    expect(remainingUnits(plato, [], ctx)).toBe(3);
  });

  it("reparte el stock entre productos distintos que comparten insumo", () => {
    const a = product("p1", { kind: "compound" });
    const b = product("p2", { kind: "compound" });
    const ctx: StockContext = {
      items: [item("pan", 5)],
      recipes: [recipe("p1", [ing("pan", 1)]), recipe("p2", [ing("pan", 1)])],
      products: [a, b],
    };
    expect(remainingUnits(b, [line("l1", a, 4)], ctx)).toBe(1);
  });

  it("combo: se abre en sus componentes", () => {
    const gaseosa = product("p2", { kind: "simple", inventoryId: "inv2", inventoryQty: 1 });
    const combo = product("p3", { isCombo: true, comboItems: [{ productId: "p2", quantity: 2 }] });
    const ctx: StockContext = { items: [item("inv2", 5)], recipes: [], products: [gaseosa, combo] };
    expect(remainingUnits(combo, [], ctx)).toBe(2);
  });

  it("ignoreLineId no cuenta la reserva de la propia línea", () => {
    const botella = product("p1", { kind: "simple", inventoryId: "inv1", inventoryQty: 1 });
    const ctx: StockContext = { items: [item("inv1", 3)], recipes: [], products: [botella] };
    const l = line("l1", botella, 2);
    expect(remainingUnits(botella, [l], ctx, undefined, "l1")).toBe(3);
  });

  it("una variación con insumo propio descuenta el suyo", () => {
    const trago = product("p1", {
      kind: "simple", inventoryId: "normal", inventoryQty: 1,
      variations: [{ id: "v1", name: "Doble", priceDelta: 0, useDefaultSupply: false, inventoryId: "premium", inventoryQty: 2 }],
    });
    const ctx: StockContext = { items: [item("normal", 10), item("premium", 5)], recipes: [], products: [trago] };
    expect(remainingUnits(trago, [], ctx, "v1")).toBe(2);
    expect(remainingUnits(trago, [], ctx)).toBe(10);
  });

  describe("ante la duda no limita", () => {
    it("producto sin insumo vinculado", () => {
      const suelto = product("p1", { kind: "simple" });
      const ctx: StockContext = { items: [item("inv1", 0)], recipes: [], products: [suelto] };
      expect(remainingUnits(suelto, [], ctx)).toBe(Infinity);
    });

    it("compuesto sin ficha técnica", () => {
      const plato = product("p1", { kind: "compound" });
      const ctx: StockContext = { items: [item("inv1", 0)], recipes: [], products: [plato] };
      expect(remainingUnits(plato, [], ctx)).toBe(Infinity);
    });

    it("inventario todavía sin cargar", () => {
      const botella = product("p1", { kind: "simple", inventoryId: "inv1", inventoryQty: 1 });
      const ctx: StockContext = { items: [], recipes: [], products: [botella] };
      expect(remainingUnits(botella, [], ctx)).toBe(Infinity);
    });

    it("la ficha apunta a un insumo que ya no existe", () => {
      const plato = product("p1", { kind: "compound" });
      const ctx: StockContext = {
        items: [item("otro", 5)],
        recipes: [recipe("p1", [ing("borrado", 1)])],
        products: [plato],
      };
      expect(remainingUnits(plato, [], ctx)).toBe(Infinity);
    });

    it("un combo que se contiene a sí mismo no cuelga la caja", () => {
      const combo = product("p1", { isCombo: true, comboItems: [{ productId: "p1", quantity: 1 }] });
      const ctx: StockContext = { items: [item("inv1", 5)], recipes: [], products: [combo] };
      expect(unitDemand(combo, ctx).size).toBe(0);
    });
  });

  it("convierte unidades: receta en gramos, insumo en kilos", () => {
    const plato = product("p1", { kind: "compound" });
    const ctx: StockContext = {
      items: [item("queso", 1, "kg")],
      recipes: [recipe("p1", [ing("queso", 200, "g")])],
      products: [plato],
    };
    // 1 kg = 1000 g → alcanza para 5 platos de 200 g.
    expect(remainingUnits(plato, [], ctx)).toBe(5);
  });
});
