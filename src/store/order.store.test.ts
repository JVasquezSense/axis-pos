import { describe, it, expect } from "vitest";
import type { OrderLine, Product } from "@/types";
import { groupLinesByOrder } from "./order.store";

const product = { id: "p1", name: "Buchanan's" } as Product;

function line(id: string, orderId?: string): OrderLine {
  return { id, product, quantity: 1, modifiers: [], unitPrice: 1000, orderId };
}

describe("reparto de líneas entre las órdenes de una mesa", () => {
  it("devuelve cada línea a la orden de la que salió", () => {
    const grouped = groupLinesByOrder(["10", "11"], [line("a", "10"), line("b", "11"), line("c", "11")]);
    expect(grouped.get("10")!.map((l) => l.id)).toEqual(["a"]);
    expect(grouped.get("11")!.map((l) => l.id)).toEqual(["b", "c"]);
  });

  it("no duplica: cada línea va a una sola orden", () => {
    const lines = [line("a", "10"), line("b", "11"), line("c")];
    const grouped = groupLinesByOrder(["10", "11"], lines);
    const total = [...grouped.values()].reduce((s, ls) => s + ls.length, 0);
    expect(total).toBe(lines.length);
  });

  it("lo agregado en el POS (sin orden) va a la primera", () => {
    const grouped = groupLinesByOrder(["10", "11"], [line("nueva")]);
    expect(grouped.get("10")!.map((l) => l.id)).toEqual(["nueva"]);
    expect(grouped.get("11")).toEqual([]);
  });

  it("una orden que se quedó sin líneas se guarda vacía", () => {
    const grouped = groupLinesByOrder(["10", "11"], [line("a", "10")]);
    expect(grouped.get("11")).toEqual([]);
  });

  it("una línea cuya orden ya no está activa cae en la primera", () => {
    const grouped = groupLinesByOrder(["10"], [line("huerfana", "99")]);
    expect(grouped.get("10")!.map((l) => l.id)).toEqual(["huerfana"]);
  });
});
