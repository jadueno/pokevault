import type { CatalogProvider, ExternalCatalogCard, ExternalCatalogSet } from "../../domain/ports.js";

const FAKE_SETS: ExternalCatalogSet[] = [
  {
    externalId: "base1",
    name: "Base",
    series: "Base",
    printedTotal: 102,
    total: 102,
    releaseDate: "1999-01-09",
    symbolUrl: null,
    logoUrl: null,
  },
  {
    externalId: "swsh1",
    name: "Espada y Escudo",
    series: "Espada y Escudo",
    printedTotal: 202,
    total: 216,
    releaseDate: "2020-02-07",
    symbolUrl: null,
    logoUrl: null,
  },
];

const FAKE_CARDS: Record<string, ExternalCatalogCard[]> = {
  base1: [
    {
      externalId: "base1-4",
      setExternalId: "base1",
      name: "Charizard",
      number: "4",
      rarity: "Rare Holo",
      artist: "Mitsuhiro Arita",
      supertype: "Pokémon",
      subtypes: ["Stage 2"],
      types: ["Fire"],
      imageSmallUrl: "https://images.pokemontcg.io/base1/4.png",
      imageLargeUrl: "https://images.pokemontcg.io/base1/4_hires.png",
      price: { amount: 350, currency: "EUR" },
    },
    {
      externalId: "base1-25",
      setExternalId: "base1",
      name: "Pikachu",
      number: "25",
      rarity: "Common",
      artist: "Atsuko Nishida",
      supertype: "Pokémon",
      subtypes: ["Basic"],
      types: ["Lightning"],
      imageSmallUrl: "https://images.pokemontcg.io/base1/25.png",
      imageLargeUrl: "https://images.pokemontcg.io/base1/25_hires.png",
      price: { amount: 8, currency: "EUR" },
    },
  ],
  swsh1: [
    {
      externalId: "swsh1-4",
      setExternalId: "swsh1",
      name: "Charizard",
      number: "4",
      rarity: "Rare Holo",
      artist: "5ban Graphics",
      supertype: "Pokémon",
      subtypes: ["Stage 2"],
      types: ["Fire"],
      imageSmallUrl: "https://images.pokemontcg.io/swsh1/4.png",
      imageLargeUrl: "https://images.pokemontcg.io/swsh1/4_hires.png",
      price: { amount: 45, currency: "EUR" },
    },
  ],
};

/** Fixture determinista, sin red — usado en tests de integración y en el entorno E2E,
 * incluye "Charizard" para que el flujo completo sea testeable sin depender de la API real. */
export function createFakeCatalogProvider(): CatalogProvider {
  return {
    name: "fake",
    async listSets() {
      return FAKE_SETS;
    },
    async listCardsBySet(setExternalId: string) {
      return { cards: FAKE_CARDS[setExternalId] ?? [], hasMore: false };
    },
  };
}
