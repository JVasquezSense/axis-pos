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
