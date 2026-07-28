import type { SealedPurchaseRepository } from "../domain/ports.js";
import type { NewSealedPurchase } from "../domain/types.js";
import { assertNonEmpty, ValidationError } from "./errors.js";

const PRODUCT_TYPES = ["booster_pack", "booster_box", "elite_trainer_box", "bundle", "tin", "other"];

function validate(entity: NewSealedPurchase): void {
  assertNonEmpty(entity.productName, "El nombre del producto");
  if (!PRODUCT_TYPES.includes(entity.productType)) {
    throw new ValidationError(`El tipo de producto debe ser uno de: ${PRODUCT_TYPES.join(", ")}`);
  }
  if (!Number.isInteger(entity.quantity) || entity.quantity < 1) {
    throw new ValidationError("La cantidad debe ser un número entero mayor que 0");
  }
}

export function createSealedPurchaseUseCases(repo: SealedPurchaseRepository) {
  return {
    list: () => repo.list(),

    create: (entity: NewSealedPurchase) => {
      validate(entity);
      return repo.create(entity);
    },

    update: (id: string, entity: NewSealedPurchase) => {
      validate(entity);
      return repo.update(id, entity);
    },

    remove: (id: string) => repo.remove(id),

    /** No hay precio de mercado automático para sellado: se estima a mano, y la
     * corrección queda identificada como tal — mismo patrón que collectionItems. */
    overrideEstimatedValue: async (id: string, value: number, note: string | null) => {
      const existing = await repo.findById(id);
      if (!existing) throw new ValidationError("No existe esa compra de producto sellado");
      const { id: _id, ...rest } = existing;
      return repo.update(id, {
        ...rest,
        estimatedValueOverride: value,
        estimatedValueOverrideAt: new Date().toISOString(),
        estimatedValueOverrideNote: note,
      });
    },
  };
}
