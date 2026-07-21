import type { PokemonTcgProvider, PokemonTcgSetCandidate, PokemonTcgSetCards } from "../../domain/ports.js";

/** Fixture determinista para tests: no depende de red ni de pokemontcg.io. Conoce un solo
 * set fijo ("Test Set" / "ts1", 2 cartas, una con precio y otra sin él) — suficiente para
 * probar buscar → elegir → sincronizar sin depender de datos reales. */
export function createFakePokemonTcgProvider(): PokemonTcgProvider {
  return {
    async searchSets(query: string): Promise<PokemonTcgSetCandidate[]> {
      if (!"test set".includes(query.toLowerCase())) return [];
      return [{ externalSetId: "ts1", name: "Test Set", totalCards: 2, releaseDate: "2026/01/01" }];
    },

    async getSetCards(externalSetId: string): Promise<PokemonTcgSetCards> {
      if (externalSetId !== "ts1") throw new Error(`${externalSetId} -> HTTP 404`);
      return {
        setName: "Test Set",
        totalCards: 2,
        cards: [
          {
            number: "1",
            name: "Fake Pikachu",
            rarity: "Common",
            imageUrl: "https://example.com/ts1-1-small.png",
            imageUrlLarge: "https://example.com/ts1-1-large.png",
            referencePrice: 1.5,
          },
          {
            number: "2",
            name: "Fake Charizard",
            rarity: "Rare Holo",
            imageUrl: "https://example.com/ts1-2-small.png",
            imageUrlLarge: "https://example.com/ts1-2-large.png",
            referencePrice: null,
          },
        ],
      };
    },
  };
}
