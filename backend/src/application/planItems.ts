import type { PlanItemRepository } from "../domain/ports.js";
import type { NewPlanItem, PlanCategory } from "../domain/types.js";
import { assertNonEmpty, ValidationError } from "./errors.js";

const CATEGORIES: PlanCategory[] = ["comprar", "abrir", "guardar_sellado"];
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function validate(entity: NewPlanItem): void {
  if (!MONTH_RE.test(entity.month)) {
    throw new ValidationError("El mes debe tener formato AAAA-MM");
  }
  if (!CATEGORIES.includes(entity.category)) {
    throw new ValidationError(`La categoría debe ser una de: ${CATEGORIES.join(", ")}`);
  }
  assertNonEmpty(entity.description, "La descripción");
  if (entity.referencePrice !== null && entity.referencePrice < 0) {
    throw new ValidationError("El precio de referencia no puede ser negativo");
  }
}

export function createPlanItemUseCases(repo: PlanItemRepository) {
  return {
    list: () => repo.list(),

    create: (entity: NewPlanItem) => {
      validate(entity);
      return repo.create(entity);
    },

    update: (id: string, entity: NewPlanItem) => {
      validate(entity);
      return repo.update(id, entity);
    },

    remove: (id: string) => repo.remove(id),

    /** Casilla "hecho" independiente de "Ya la tengo": no exige idioma/estado/precio
     * ni pasa por la colección, así que se resuelve aquí en vez de en wishlistItems. */
    toggleDone: async (id: string) => {
      const items = await repo.list();
      const item = items.find((i) => i.id === id);
      if (!item) throw new ValidationError("No existe ese ítem del plan");
      const { id: _id, ...rest } = item;
      return repo.update(id, { ...rest, done: !item.done });
    },
  };
}
