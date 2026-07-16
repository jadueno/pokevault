import { describe, expect, it } from "vitest";
import type { CollectionItem, NewCollectionItem } from "../domain/types.js";
import { callAsync } from "../test/callAsync.js";
import { createFakeRepository } from "../test/fakeRepository.js";
import { createCollectionItemUseCases } from "./collectionItems.js";

function validItem(overrides: Partial<NewCollectionItem> = {}): NewCollectionItem {
  return {
    name: "Charizard",
    setName: "Base",
    number: "4",
    rarity: "Rare Holo",
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
    photo: null,
    ...overrides,
  };
}

function setup() {
  const repo = createFakeRepository<CollectionItem, NewCollectionItem>();
  return { repo, useCases: createCollectionItemUseCases(repo) };
}

describe("createCollectionItemUseCases", () => {
  it("añade un ejemplar válido", async () => {
    const { useCases } = setup();
    const created = await useCases.create(validItem());
    expect(created.name).toBe("Charizard");
    expect(created.language).toBe("es");
    expect(created.condition).toBe("near_mint");
  });

  it("rechaza un nombre vacío", async () => {
    const { useCases } = setup();
    await expect(callAsync(() => useCases.create(validItem({ name: "  " })))).rejects.toThrow(
      "no puede estar vacío",
    );
  });

  it("rechaza un idioma no reconocido", async () => {
    const { useCases } = setup();
    await expect(callAsync(() => useCases.create(validItem({ language: "klingon" as never })))).rejects.toThrow(
      "El idioma debe ser uno de",
    );
  });

  it("rechaza un estado no reconocido", async () => {
    const { useCases } = setup();
    await expect(callAsync(() => useCases.create(validItem({ condition: "brand_new" as never })))).rejects.toThrow(
      "El estado debe ser uno de",
    );
  });

  it("rechaza cantidad no entera o menor que 1", async () => {
    const { useCases } = setup();
    await expect(callAsync(() => useCases.create(validItem({ quantity: 0 })))).rejects.toThrow("mayor que 0");
  });

  it("rechaza vincular a un sobre si no es 'pulled_from_pack'", async () => {
    const { useCases } = setup();
    await expect(
      callAsync(() => useCases.create(validItem({ acquisitionType: "purchased_single", sealedPurchaseId: "sp-1" }))),
    ).rejects.toThrow("Solo se puede vincular a un sobre");
  });

  it("permite un ejemplar sin precio de compra cuando vino de un sobre (no rellena con 0)", async () => {
    const { useCases } = setup();
    const created = await useCases.create(
      validItem({ acquisitionType: "pulled_from_pack", sealedPurchaseId: "sp-1", purchasePrice: null }),
    );
    expect(created.purchasePrice).toBeNull();
  });

  it("rechaza una carta graduada sin empresa de gradación", async () => {
    const { useCases } = setup();
    await expect(
      callAsync(() => useCases.create(validItem({ isGraded: true, gradingCompany: null }))),
    ).rejects.toThrow("debe indicar la empresa de gradación");
  });

  it("cada alta es una fila nueva: no sobrescribe el precio de compra de un ejemplar existente", async () => {
    const { useCases, repo } = setup();
    const first = await useCases.create(validItem({ purchasePrice: 25 }));
    await useCases.create(validItem({ purchasePrice: 40 }));
    const all = await repo.list();
    const untouched = all.find((i) => i.id === first.id);
    expect(untouched?.purchasePrice).toBe(25);
    expect(all).toHaveLength(2);
  });

  it("overrideEstimatedValue marca la corrección manual con fecha y nota, sin tocar el resto del ejemplar", async () => {
    const { useCases } = setup();
    const created = await useCases.create(validItem());
    const updated = await useCases.overrideEstimatedValue(created.id, 150, "Vista en eBay a ese precio");
    expect(updated?.estimatedValueOverride).toBe(150);
    expect(updated?.estimatedValueOverrideNote).toBe("Vista en eBay a ese precio");
    expect(updated?.estimatedValueOverrideAt).not.toBeNull();
    expect(updated?.purchasePrice).toBe(25);
  });

  it("summary() suma valor estimado × cantidad, usando la corrección manual", async () => {
    const { useCases } = setup();
    const created = await useCases.create(validItem({ quantity: 2 }));
    await useCases.overrideEstimatedValue(created.id, 120, "Estimado a mano");
    const summary = await useCases.summary();
    expect(summary.totalValue).toBe(240);
    expect(summary.itemsWithoutValue).toBe(0);
    expect(summary.totalInvested).toBe(50); // 25 * 2
  });

  it("summary() cuenta aparte (no como 0) los ejemplares sin valor estimado conocido", async () => {
    const { useCases } = setup();
    await useCases.create(validItem({ name: "Pikachu" }));
    const summary = await useCases.summary();
    expect(summary.totalValue).toBe(0);
    expect(summary.itemsWithoutValue).toBe(1);
  });
});
