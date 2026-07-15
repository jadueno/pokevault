import type { CatalogRepository, CollectionItemRepository, WishlistItemRepository } from "../domain/ports.js";
import type { CardCondition, CardLanguage, NewCollectionItem, NewWishlistItem, WishlistItemWithCard } from "../domain/types.js";
import { assertNonEmpty, ValidationError } from "./errors.js";

const PRIORITIES = ["low", "medium", "high"];
const TARGET_MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

function validate(entity: NewWishlistItem): void {
  assertNonEmpty(entity.catalogCardId, "La carta");
  if (!PRIORITIES.includes(entity.priority)) {
    throw new ValidationError(`La prioridad debe ser una de: ${PRIORITIES.join(", ")}`);
  }
  if (entity.targetMonth && !TARGET_MONTH_RE.test(entity.targetMonth)) {
    throw new ValidationError("El mes objetivo debe tener formato AAAA-MM");
  }
}

export interface MoveToCollectionDetails {
  language: CardLanguage;
  condition: CardCondition;
  quantity: number;
  purchasePrice: number | null;
  purchaseCurrency: string;
  purchaseDate: string | null;
  notes: string | null;
}

export function createWishlistItemUseCases(
  repo: WishlistItemRepository,
  catalogRepo: CatalogRepository,
  collectionRepo: CollectionItemRepository,
) {
  async function withCards(
    items: Awaited<ReturnType<WishlistItemRepository["list"]>>,
  ): Promise<WishlistItemWithCard[]> {
    if (items.length === 0) return [];
    const cards = await catalogRepo.getCardsByIds([...new Set(items.map((i) => i.catalogCardId))]);
    const cardById = new Map(cards.map((c) => [c.id, c]));
    return items.map((item) => {
      const card = cardById.get(item.catalogCardId);
      if (!card) throw new Error(`Carta de catálogo no encontrada para el deseo ${item.id}`);
      return { ...item, card };
    });
  }

  return {
    list: async (): Promise<WishlistItemWithCard[]> => withCards(await repo.list()),

    create: (entity: NewWishlistItem) => {
      validate(entity);
      return repo.create(entity);
    },

    update: (id: string, entity: NewWishlistItem) => {
      validate(entity);
      return repo.update(id, entity);
    },

    remove: (id: string) => repo.remove(id),

    /** Registra la compra en la colección y quita el elemento de la wishlist en la
     * misma operación — "mover a colección" no es una tabla nueva, es este caso de uso. */
    moveToCollection: async (id: string, details: MoveToCollectionDetails) => {
      const items = await repo.list();
      const wishlistItem = items.find((i) => i.id === id);
      if (!wishlistItem) throw new ValidationError("No existe ese elemento de la wishlist");

      const newItem: NewCollectionItem = {
        catalogCardId: wishlistItem.catalogCardId,
        language: details.language,
        condition: details.condition,
        quantity: details.quantity,
        acquisitionType: "purchased_single",
        sealedPurchaseId: null,
        purchasePrice: details.purchasePrice,
        purchaseCurrency: details.purchaseCurrency,
        purchaseDate: details.purchaseDate,
        isGraded: false,
        gradingCompany: null,
        grade: null,
        estimatedValueOverride: null,
        estimatedValueOverrideAt: null,
        estimatedValueOverrideNote: null,
        notes: details.notes,
      };
      const created = await collectionRepo.create(newItem);
      await repo.remove(id);
      return created;
    },
  };
}
