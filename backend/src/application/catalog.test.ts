import { describe, expect, it } from "vitest";
import { createFakeCatalogRepository } from "../test/fakeCatalogRepository.js";
import { createCatalogUseCases } from "./catalog.js";

async function setup() {
  const repo = createFakeCatalogRepository();
  const set = await repo.upsertSet("fake", {
    externalId: "swsh1",
    name: "Escarlata y Púrpura",
    series: null,
    printedTotal: null,
    total: null,
    releaseDate: null,
    symbolUrl: null,
    logoUrl: null,
  });
  await repo.upsertCard("fake", set.id, {
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
  return { useCases: createCatalogUseCases(repo), set };
}

describe("createCatalogUseCases", () => {
  it("busca cartas por nombre (case-insensitive)", async () => {
    const { useCases } = await setup();
    const results = await useCases.searchCards({ query: "charizard" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe("Charizard");
  });

  it("filtra por set", async () => {
    const { useCases, set } = await setup();
    const results = await useCases.searchCards({ setId: set.id });
    expect(results).toHaveLength(1);
  });

  it("lista los sets disponibles", async () => {
    const { useCases } = await setup();
    const sets = await useCases.listSets();
    expect(sets.map((s) => s.name)).toContain("Escarlata y Púrpura");
  });
});
