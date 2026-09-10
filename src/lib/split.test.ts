import { describe, it, expect } from "vitest";
import { distribute } from "./split";

describe("distribute (división de cuenta)", () => {
  it("reparte equitativo y suma exactamente el total", () => {
    const r = distribute(100000, [1, 1, 1]);
    expect(r.reduce((a, b) => a + b, 0)).toBe(100000);
    // 100000/3 = 33333.33 → [33334, 33333, 33333]
    expect(r).toEqual([33334, 33333, 33333]);
  });

  it("respeta los pesos (por producto) y cuadra el total", () => {
    const r = distribute(90000, [2, 1]); // 60000 / 30000
    expect(r.reduce((a, b) => a + b, 0)).toBe(90000);
    expect(r).toEqual([60000, 30000]);
  });

  it("maneja una sola persona", () => {
    expect(distribute(45000, [1])).toEqual([45000]);
  });

  it("nunca pierde ni inventa pesos con cifras irregulares", () => {
    const r = distribute(99999, [1, 1, 1, 1, 1, 1, 1]);
    expect(r.reduce((a, b) => a + b, 0)).toBe(99999);
  });

  it("devuelve vacío si no hay personas", () => {
    expect(distribute(1000, [])).toEqual([]);
  });
});

describe("división por unidades (cada quien lo suyo)", () => {
  it("dos cervezas, una para cada uno, reparten el total según lo consumido", () => {
    // Persona 1: 1 cerveza (5000); persona 2: 1 cerveza (5000) + 1 mojito (20000)
    const weights = [5000, 25000];
    const sub = distribute(30000, weights);
    const tax = distribute(2400, weights); // 8%
    expect(sub).toEqual([5000, 25000]);
    expect(tax).toEqual([400, 2000]);
    const totals = weights.map((_, i) => sub[i] + tax[i]);
    expect(totals.reduce((a, b) => a + b, 0)).toBe(32400);
  });

  it("lo que nadie reclama se reparte entre todos", () => {
    // 3 unidades de 10000: persona 1 reclama 1, quedan 2 libres entre 2 personas
    const people = 2;
    const free = 2;
    const w = [10000 + (free * 10000) / people, (free * 10000) / people];
    expect(distribute(30000, w)).toEqual([20000, 10000]);
  });
});
