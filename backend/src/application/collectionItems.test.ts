import { describe, expect, it } from "vitest";
import type { NewCollectionItem } from "../domain/types.js";
import { createFakeCatalogRepository } from "../test/fakeCatalogRepository.js";
import { callAsync } from "../test/callAsync.js";
import { createCollectionItemUseCases } from "./collectionItems.js";
import { createFakeRepository } from "../test/fakeRepository.js";
import type { CollectionItem } from "../domain/types.js";

function validItem(overrides: Partial<NewCollectionItem> = {}, catalogCardId: string): NewCollectionItem {
  return {
    catalogCardId,
    language: "es",
    condition: "near_mint",
    quantity: 1,
    acquisitionType: "purchased_single",
    sealedPurchaseId: null,
    purchasePrice: 25,
    purchaseCurrency: "EUR",
    purchaseDate: "2026-07-01",
    isGraded: false,
    gradingCompany: null,
    grade: null,
    estimatedValueOverride: null,
    estimatedValueOverrideAt: null,
    estimatedValueOverrideNote: null,
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
    printedTotal: 200,
    total: 200,
    releaseDate: "2026-01-01",
    symbolUrl: null,
    logoUrl: null,
  });
  const card = await catalogRepo.upsertCard("fake", set.id, {
    externalId: "swsh1-4",
    setExternalId: "swsh1",
    name: "Charizard",
    number: "4",
    rarity: "Rare Holo",
    artist: "Mitsuhiro Arita",
    supertype: "Pokémon",
    subtypes: ["Stage 2"],
    types: ["Fire"],
    imageSmallUrl: null,
    imageLargeUrl: null,
    price: { amount: 120, currency: "EUR" },
  });
  const repo = createFakeRepository<CollectionItem, NewCollectionItem>();
  const useCases = createCollectionItemUseCases(repo, catalogRepo);
  return { useCases, repo, catalogRepo, card };
}

describe("createCollectionItemUseCases", () => {
  it("añade un ejemplar válido", async () => {
    const { useCases, card } = await setup();
    const created = await useCases.create(validItem({}, card.id));
    expect(created.language).toBe("es");
    expect(created.condition).toBe("near_mint");
  });

  it("rechaza un idioma no reconocido", async () => {
    const { useCases, card } = await setup();
    await expect(
      callAsync(() => useCases.create(validItem({ language: "klingon" as never }, card.id))),
    ).rejects.toThrow("El idioma debe ser uno de");
  });

  it("rechaza un estado no reconocido", async () => {
    const { useCases, card } = await setup();
    await expect(
      callAsync(() => useCases.create(validItem({ condition: "brand_new" as never }, card.id))),
    ).rejects.toThrow("El estado debe ser uno de");
  });

  it("rechaza cantidad no entera o menor que 1", async () => {
    const { useCases, card } = await setup();
    await expect(callAsync(() => useCases.create(validItem({ quantity: 0 }, card.id)))).rejects.toThrow(
      "mayor que 0",
    );
  });

  it("rechaza vincular a un sobre si no es 'pulled_from_pack'", async () => {
    const { useCases, card } = await setup();
    await expect(
      callAsync(() =>
        useCases.create(validItem({ acquisitionType: "purchased_single", sealedPurchaseId: "sp-1" }, card.id)),
      ),
    ).rejects.toThrow("Solo se puede vincular a un sobre");
  });

  it("permite un ejemplar sin precio de compra cuando vino de un sobre (no rellena con 0)", async () => {
    const { useCases, card } = await setup();
    const created = await useCases.create(
      validItem(
        { acquisitionType: "pulled_from_pack", sealedPurchaseId: "sp-1", purchasePrice: null },
        card.id,
      ),
    );
    expect(created.purchasePrice).toBeNull();
  });

  it("rechaza una carta graduada sin empresa de gradación", async () => {
    const { useCases, card } = await setup();
    await expect(
      callAsync(() => useCases.create(validItem({ isGraded: true, gradingCompany: null }, card.id))),
    ).rejects.toThrow("debe indicar la empresa de gradación");
  });

  it("list() devuelve los ejemplares con la carta de catálogo ya unida", async () => {
    const { useCases, card } = await setup();
    await useCases.create(validItem({}, card.id));
    const [item] = await useCases.list();
    expect(item.card.name).toBe("Charizard");
  });

  it("cada alta es una fila nueva: no sobrescribe el precio de compra de un ejemplar existente", async () => {
    const { useCases, repo, card } = await setup();
    const first = await useCases.create(validItem({ purchasePrice: 25 }, card.id));
    await useCases.create(validItem({ purchasePrice: 40 }, card.id));
    const all = await repo.list();
    const untouched = all.find((i) => i.id === first.id);
    expect(untouched?.purchasePrice).toBe(25);
    expect(all).toHaveLength(2);
  });

  it("overrideEstimatedValue marca la corrección manual con fecha y nota, sin tocar el resto del ejemplar", async () => {
    const { useCases, card } = await setup();
    const created = await useCases.create(validItem({}, card.id));
    const updated = await useCases.overrideEstimatedValue(created.id, 150, "Vista en eBay a ese precio");
    expect(updated?.estimatedValueOverride).toBe(150);
    expect(updated?.estimatedValueOverrideNote).toBe("Vista en eBay a ese precio");
    expect(updated?.estimatedValueOverrideAt).not.toBeNull();
    expect(updated?.purchasePrice).toBe(25);
  });

  it("summary() suma valor estimado × cantidad, usando la corrección manual si existe", async () => {
    const { useCases, card } = await setup();
    await useCases.create(validItem({ quantity: 2 }, card.id)); // 120 * 2 = 240
    const summary = await useCases.summary();
    expect(summary.totalValue).toBe(240);
    expect(summary.itemsWithoutValue).toBe(0);
    expect(summary.totalInvested).toBe(50); // 25 * 2
  });

  it("summary() cuenta aparte (no como 0) los ejemplares sin valor estimado conocido", async () => {
    const { useCases, catalogRepo } = await setup();
    const setB = await catalogRepo.upsertSet("fake", {
      externalId: "swsh2",
      name: "Otro set",
      series: null,
      printedTotal: null,
      total: null,
      releaseDate: null,
      symbolUrl: null,
      logoUrl: null,
    });
    const cardWithoutPrice = await catalogRepo.upsertCard("fake", setB.id, {
      externalId: "swsh2-1",
      setExternalId: "swsh2",
      name: "Pikachu",
      number: "1",
      rarity: "Common",
      artist: null,
      supertype: "Pokémon",
      subtypes: [],
      types: ["Electric"],
      imageSmallUrl: null,
      imageLargeUrl: null,
      price: null,
    });
    await useCases.create(validItem({}, cardWithoutPrice.id));
    const summary = await useCases.summary();
    expect(summary.totalValue).toBe(0);
    expect(summary.itemsWithoutValue).toBe(1);
  });
});
