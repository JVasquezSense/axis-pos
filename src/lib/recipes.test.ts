import { describe, it, expect } from "vitest";
import { computeRecipeCost, effectiveQty, TARGET_FOOD_COST } from "./recipes";
import { RECIPES } from "@/mock/recipes";

describe("motor de costeo de recetas", () => {
  const recipe = RECIPES.find((r) => r.id === "r1")!; // Axis Classic

  it("la merma aumenta la cantidad efectiva consumida", () => {
    expect(effectiveQty({ id: "x", inventoryId: "i1", name: "", unit: "kg", quantity: 1, waste: 0.5 })).toBeCloseTo(2);
    expect(effectiveQty({ id: "x", inventoryId: "i1", name: "", unit: "kg", quantity: 2, waste: 0 })).toBe(2);
  });

  it("calcula costo por porción positivo y coherente", () => {
    const c = computeRecipeCost(recipe);
    expect(c.costPerPortion).toBeGreaterThan(0);
    expect(c.totalCost).toBeGreaterThanOrEqual(c.costPerPortion);
  });

  it("food cost = costo/porción ÷ precio y margen = precio − costo", () => {
    const c = computeRecipeCost(recipe);
    expect(c.foodCostPct).toBeCloseTo(c.costPerPortion / recipe.price);
    expect(c.margin).toBeCloseTo(recipe.price - c.costPerPortion);
  });

  it("precio sugerido respeta el food cost objetivo", () => {
    const c = computeRecipeCost(recipe);
    expect(c.suggestedPrice).toBe(Math.round(c.costPerPortion / TARGET_FOOD_COST));
  });

  it("la disponibilidad (porciones preparables) es un entero >= 0", () => {
    const c = computeRecipeCost(recipe);
    expect(Number.isInteger(c.maxPortions)).toBe(true);
    expect(c.maxPortions).toBeGreaterThanOrEqual(0);
  });
});
