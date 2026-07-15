import { describe, expect, it } from "vitest";
import type { CollectionItem, NewCollectionItem, NewWishlistItem, WishlistItem } from "../domain/types.js";
import { createFakeCatalogRepository } from "../test/fakeCatalogRepository.js";
import { callAsync } from "../test/callAsync.js";
import { createFakeRepository } from "../test/fakeRepository.js";
import { createWishlistItemUseCases } from "./wishlistItems.js";

function validItem(overrides: Partial<NewWishlistItem> = {}, catalogCardId: string): NewWishlistItem {
  return {
    catalogCardId,
    priority: "medium",
    maxPrice: null,
    targetMonth: null,
    notes: null,
    ...overrides,
  };
}

async function setup() {
  const catalogRepo = createFakeCatalogRepository();
  const set = await catalogRepo.upsertSet("fake", {
    externalId: "swsh1",
    name: "Escarlata y Púrpura",
    series: null,
    printedTotal: null,
    total: null,
    releaseDate: null,
    symbolUrl: null,
    logoUrl: null,
  });
  const card = await catalogRepo.upsertCard("fake", set.id, {
    externalId: "swsh1-4",
    setExternalId: "swsh1",
    name: "Charizard",
    number: "4",
    rarity: "Rare Holo",
    artist: null,
    supertype: "Pokémon",
    subtypes: [],
    types: ["Fire"],
    imageSmallUrl: null,
    imageLargeUrl: null,
    price: { amount: 120, currency: "EUR" },
  });
  const repo = createFakeRepository<WishlistItem, NewWishlistItem>();
  const collectionRepo = createFakeRepository<CollectionItem, NewCollectionItem>();
  const useCases = createWishlistItemUseCases(repo, catalogRepo, collectionRepo);
  return { useCases, repo, collectionRepo, card };
}

describe("createWishlistItemUseCases", () => {
  it("añade un elemento válido", async () => {
    const { useCases, card } = await setup();
    const created = await useCases.create(validItem({ priority: "high" }, card.id));
    expect(created.priority).toBe("high");
  });

  it("rechaza una prioridad no reconocida", async () => {
    const { useCases, card } = await setup();
    await expect(
      callAsync(() => useCases.create(validItem({ priority: "urgentísimo" as never }, card.id))),
    ).rejects.toThrow("La prioridad debe ser una de");
  });

  it("acepta un mes objetivo con formato AAAA-MM", async () => {
    const { useCases, card } = await setup();
    const created = await useCases.create(validItem({ targetMonth: "2026-08" }, card.id));
    expect(created.targetMonth).toBe("2026-08");
  });

  it("rechaza un mes objetivo con formato inválido", async () => {
    const { useCases, card } = await setup();
    await expect(
      callAsync(() => useCases.create(validItem({ targetMonth: "agosto-2026" }, card.id))),
    ).rejects.toThrow("formato AAAA-MM");
  });

  it("list() devuelve los deseos con la carta de catálogo ya unida", async () => {
    const { useCases, card } = await setup();
    await useCases.create(validItem({}, card.id));
    const [item] = await useCases.list();
    expect(item.card.name).toBe("Charizard");
  });

  it("moveToCollection registra la compra en la colección y quita el elemento de la wishlist", async () => {
    const { useCases, repo, collectionRepo, card } = await setup();
    const wish = await useCases.create(validItem({}, card.id));

    const created = await useCases.moveToCollection(wish.id, {
      language: "es",
      condition: "near_mint",
      quantity: 1,
      purchasePrice: 130,
      purchaseCurrency: "EUR",
      purchaseDate: "2026-08-01",
      notes: null,
    });

    expect(created.catalogCardId).toBe(card.id);
    expect(created.acquisitionType).toBe("purchased_single");
    expect(created.purchasePrice).toBe(130);
    expect(await collectionRepo.list()).toHaveLength(1);
    expect(await repo.list()).toHaveLength(0);
  });

  it("rechaza moveToCollection para un elemento inexistente", async () => {
    const { useCases } = await setup();
    await expect(
      callAsync(() =>
        useCases.moveToCollection("no-existe", {
          language: "es",
          condition: "near_mint",
          quantity: 1,
          purchasePrice: null,
          purchaseCurrency: "EUR",
          purchaseDate: null,
          notes: null,
        }),
      ),
    ).rejects.toThrow("No existe ese elemento de la wishlist");
  });
});
