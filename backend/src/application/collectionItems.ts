import type { CollectionItemRepository } from "../domain/ports.js";
import type { CollectionSummary, NewCollectionItem } from "../domain/types.js";
import { assertNonEmpty, ValidationError } from "./errors.js";

const LANGUAGES = ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh-cn", "zh-tw", "id", "th"];
const CONDITIONS = ["mint", "near_mint", "excellent", "good", "light_played", "played", "poor"];
const ACQUISITION_TYPES = ["purchased_single", "pulled_from_pack", "trade", "gift"];

function validate(entity: NewCollectionItem): void {
  assertNonEmpty(entity.name, "El nombre");
  if (!LANGUAGES.includes(entity.language)) {
    throw new ValidationError(`El idioma debe ser uno de: ${LANGUAGES.join(", ")}`);
  }
  if (!CONDITIONS.includes(entity.condition)) {
    throw new ValidationError(`El estado debe ser uno de: ${CONDITIONS.join(", ")}`);
  }
  if (!ACQUISITION_TYPES.includes(entity.acquisitionType)) {
    throw new ValidationError(`El tipo de adquisición debe ser uno de: ${ACQUISITION_TYPES.join(", ")}`);
  }
  if (!Number.isInteger(entity.quantity) || entity.quantity < 1) {
    throw new ValidationError("La cantidad debe ser un número entero mayor que 0");
  }
  if (entity.acquisitionType !== "pulled_from_pack" && entity.sealedPurchaseId) {
    throw new ValidationError("Solo se puede vincular a un sobre si el tipo de adquisición es 'pulled_from_pack'");
  }
  if (entity.isGraded && !entity.gradingCompany) {
    throw new ValidationError("Una carta graduada debe indicar la empresa de gradación");
  }
}

export function createCollectionItemUseCases(repo: CollectionItemRepository) {
  return {
    list: () => repo.list(),

    create: (entity: NewCollectionItem) => {
      validate(entity);
      return repo.create(entity);
    },

    update: (id: string, entity: NewCollectionItem) => {
      validate(entity);
      return repo.update(id, entity);
    },

    remove: (id: string) => repo.remove(id),

    /** Corrección manual del valor estimado — queda identificada como tal (fecha + nota).
     * Sin catálogo externo, es la única fuente de valor: nunca se inventa un precio. */
    overrideEstimatedValue: async (id: string, value: number, note: string | null) => {
      const items = await repo.list();
      const existing = items.find((i) => i.id === id);
      if (!existing) throw new ValidationError("No existe ese ejemplar");
      const { id: _id, ...rest } = existing;
      return repo.update(id, {
        ...rest,
        estimatedValueOverride: value,
        estimatedValueOverrideAt: new Date().toISOString(),
        estimatedValueOverrideNote: note,
      });
    },

    summary: async (): Promise<CollectionSummary> => {
      const items = await repo.list();
      let totalQuantity = 0;
      let totalValue = 0;
      let itemsWithoutValue = 0;
      let totalInvested = 0;
      for (const item of items) {
        totalQuantity += item.quantity;
        if (item.estimatedValueOverride === null) itemsWithoutValue++;
        else totalValue += item.estimatedValueOverride * item.quantity;
        if (item.purchasePrice !== null) totalInvested += item.purchasePrice * item.quantity;
      }
      return { totalItems: items.length, totalQuantity, totalValue, itemsWithoutValue, totalInvested };
    },
  };
}
