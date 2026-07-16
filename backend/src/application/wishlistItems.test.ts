import { describe, expect, it } from "vitest";
import type { CollectionItem, NewCollectionItem, NewWishlistItem, WishlistItem } from "../domain/types.js";
import { callAsync } from "../test/callAsync.js";
import { createFakeRepository } from "../test/fakeRepository.js";
import { createWishlistItemUseCases } from "./wishlistItems.js";

function validItem(overrides: Partial<NewWishlistItem> = {}): NewWishlistItem {
  return {
    name: "Charizard",
    setName: "Base",
    priority: "medium",
    maxPrice: null,
    targetMonth: null,
    notes: null,
    photo: null,
    ...overrides,
  };
}

function setup() {
  const repo = createFakeRepository<WishlistItem, NewWishlistItem>();
  const collectionRepo = createFakeRepository<CollectionItem, NewCollectionItem>();
  const useCases = createWishlistItemUseCases(repo, collectionRepo);
  return { useCases, repo, collectionRepo };
}

describe("createWishlistItemUseCases", () => {
  it("añade un elemento válido", async () => {
    const { useCases } = setup();
    const created = await useCases.create(validItem({ priority: "high" }));
    expect(created.priority).toBe("high");
    expect(created.name).toBe("Charizard");
  });

  it("rechaza un nombre vacío", async () => {
    const { useCases } = setup();
    await expect(callAsync(() => useCases.create(validItem({ name: "  " })))).rejects.toThrow(
      "no puede estar vacío",
    );
  });

  it("rechaza una prioridad no reconocida", async () => {
    const { useCases } = setup();
    await expect(
      callAsync(() => useCases.create(validItem({ priority: "urgentísimo" as never }))),
    ).rejects.toThrow("La prioridad debe ser una de");
  });

  it("acepta un mes objetivo con formato AAAA-MM", async () => {
    const { useCases } = setup();
    const created = await useCases.create(validItem({ targetMonth: "2026-08" }));
    expect(created.targetMonth).toBe("2026-08");
  });

  it("rechaza un mes objetivo con formato inválido", async () => {
    const { useCases } = setup();
    await expect(callAsync(() => useCases.create(validItem({ targetMonth: "agosto-2026" })))).rejects.toThrow(
      "formato AAAA-MM",
    );
  });

  it("moveToCollection registra la compra en la colección y quita el elemento de la wishlist", async () => {
    const { useCases, repo, collectionRepo } = setup();
    const wish = await useCases.create(validItem());

    const created = await useCases.moveToCollection(wish.id, {
      language: "es",
      condition: "near_mint",
      quantity: 1,
      purchasePrice: 130,
      purchaseCurrency: "EUR",
      purchaseDate: "2026-08-01",
      notes: null,
    });

    expect(created.name).toBe("Charizard");
    expect(created.acquisitionType).toBe("purchased_single");
    expect(created.purchasePrice).toBe(130);
    expect(await collectionRepo.list()).toHaveLength(1);
    expect(await repo.list()).toHaveLength(0);
  });

  it("rechaza moveToCollection para un elemento inexistente", async () => {
    const { useCases } = setup();
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
