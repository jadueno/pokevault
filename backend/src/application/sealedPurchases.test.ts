import { describe, expect, it } from "vitest";
import type { NewSealedPurchase, SealedPurchase } from "../domain/types.js";
import { callAsync } from "../test/callAsync.js";
import { createFakeRepository } from "../test/fakeRepository.js";
import { createSealedPurchaseUseCases } from "./sealedPurchases.js";

function validPurchase(overrides: Partial<NewSealedPurchase> = {}): NewSealedPurchase {
  return {
    productName: "Sobre Evoluciones Prismáticas",
    catalogSetId: null,
    productType: "booster_pack",
    quantity: 1,
    purchasePrice: 5.5,
    purchaseCurrency: "EUR",
    purchaseDate: "2026-07-01",
    estimatedValueOverride: null,
    estimatedValueOverrideAt: null,
    estimatedValueOverrideNote: null,
    location: "Cajón del salón",
    notes: null,
    ...overrides,
  };
}

function setup() {
  const repo = createFakeRepository<SealedPurchase, NewSealedPurchase>();
  return { repo, useCases: createSealedPurchaseUseCases(repo) };
}

describe("createSealedPurchaseUseCases", () => {
  it("añade una compra válida", async () => {
    const { useCases } = setup();
    const created = await useCases.create(validPurchase({ productName: "Caja Escarlata y Púrpura" }));
    expect(created.productName).toBe("Caja Escarlata y Púrpura");
  });

  it("rechaza un nombre de producto vacío", async () => {
    const { useCases } = setup();
    await expect(callAsync(() => useCases.create(validPurchase({ productName: "  " })))).rejects.toThrow(
      "no puede estar vacío",
    );
  });

  it("rechaza un tipo de producto no reconocido", async () => {
    const { useCases } = setup();
    await expect(
      callAsync(() => useCases.create(validPurchase({ productType: "caja_misteriosa" as never }))),
    ).rejects.toThrow("El tipo de producto debe ser uno de");
  });

  it("rechaza cantidad no entera o menor que 1", async () => {
    const { useCases } = setup();
    await expect(callAsync(() => useCases.create(validPurchase({ quantity: 0 })))).rejects.toThrow("mayor que 0");
  });

  it("overrideEstimatedValue marca la corrección manual con fecha y nota", async () => {
    const { useCases } = setup();
    const created = await useCases.create(validPurchase());
    const updated = await useCases.overrideEstimatedValue(created.id, 8, "Precio actual en tienda local");
    expect(updated?.estimatedValueOverride).toBe(8);
    expect(updated?.estimatedValueOverrideNote).toBe("Precio actual en tienda local");
    expect(updated?.estimatedValueOverrideAt).not.toBeNull();
  });
});
