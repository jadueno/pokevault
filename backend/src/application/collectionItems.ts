import { resolveItemEstimatedValue } from "../domain/ports.js";
import type { CatalogRepository, CollectionItemRepository } from "../domain/ports.js";
import type { CollectionItemWithCard, CollectionSummary, NewCollectionItem } from "../domain/types.js";
import { assertNonEmpty, ValidationError } from "./errors.js";

const LANGUAGES = ["en", "es", "fr", "de", "it", "pt", "ja", "ko", "zh-cn", "zh-tw", "id", "th"];
const CONDITIONS = ["mint", "near_mint", "excellent", "good", "light_played", "played", "poor"];
const ACQUISITION_TYPES = ["purchased_single", "pulled_from_pack", "trade", "gift"];

function validate(entity: NewCollectionItem): void {
  assertNonEmpty(entity.catalogCardId, "La carta");
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

export function createCollectionItemUseCases(repo: CollectionItemRepository, catalogRepo: CatalogRepository) {
  async function withCards(
    items: Awaited<ReturnType<CollectionItemRepository["list"]>>,
  ): Promise<CollectionItemWithCard[]> {
    if (items.length === 0) return [];
    const cards = await catalogRepo.getCardsByIds([...new Set(items.map((i) => i.catalogCardId))]);
    const cardById = new Map(cards.map((c) => [c.id, c]));
    return items.map((item) => {
      const card = cardById.get(item.catalogCardId);
      if (!card) throw new Error(`Carta de catálogo no encontrada para el ejemplar ${item.id}`);
      return { ...item, card };
    });
  }

  return {
    list: async (): Promise<CollectionItemWithCard[]> => withCards(await repo.list()),

    create: (entity: NewCollectionItem) => {
      validate(entity);
      return repo.create(entity);
    },

    update: (id: string, entity: NewCollectionItem) => {
      validate(entity);
      return repo.update(id, entity);
    },

    remove: (id: string) => repo.remove(id),

    /** Corrección manual del valor estimado — queda identificada como tal (fecha + nota),
     * nunca se confunde con el precio que da el catálogo. */
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
      if (items.length === 0) {
        return { totalItems: 0, totalQuantity: 0, totalValue: 0, itemsWithoutValue: 0, totalInvested: 0 };
      }
      const cards = await catalogRepo.getCardsByIds([...new Set(items.map((i) => i.catalogCardId))]);
      const cardById = new Map(cards.map((c) => [c.id, c]));

      let totalQuantity = 0;
      let totalValue = 0;
      let itemsWithoutValue = 0;
      let totalInvested = 0;
      for (const item of items) {
        totalQuantity += item.quantity;
        const card = cardById.get(item.catalogCardId);
        const value = card ? resolveItemEstimatedValue(item, card) : null;
        if (value === null) itemsWithoutValue++;
        else totalValue += value * item.quantity;
        if (item.purchasePrice !== null) totalInvested += item.purchasePrice * item.quantity;
      }
      return { totalItems: items.length, totalQuantity, totalValue, itemsWithoutValue, totalInvested };
    },
  };
}
