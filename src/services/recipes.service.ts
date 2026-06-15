import type { Recipe } from "@/types";
import { RECIPES } from "@/mock/recipes";
import { mockRequest } from "./http";

/**
 * Capa de API de recetas. La lectura inicial usa mocks; las mutaciones de la
 * demo viven en `useRecipesStore`. En producción todo pasa por estos métodos:
 *
 *   GET    /api/v1/recipes/        → list
 *   GET    /api/v1/recipes/:id/    → retrieve
 *   POST   /api/v1/recipes/        → create
 *   PATCH  /api/v1/recipes/:id/    → update
 *   DELETE /api/v1/recipes/:id/    → destroy
 */
export const recipesService = {
  async list(): Promise<Recipe[]> {
    return mockRequest(RECIPES, 600);
  },
  async create(recipe: Recipe): Promise<Recipe> {
    return mockRequest(recipe, 400);
  },
  async update(recipe: Recipe): Promise<Recipe> {
    return mockRequest(recipe, 400);
  },
  async remove(id: string): Promise<{ id: string }> {
    return mockRequest({ id }, 300);
  },
};
