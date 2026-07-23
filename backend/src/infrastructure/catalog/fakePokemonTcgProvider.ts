import type { PokemonTcgProvider, PokemonTcgSetCandidate, PokemonTcgSetCards } from "../../domain/ports.js";

/** Fixture determinista para tests: no depende de red ni del proveedor real (TCGdex).
 * Conoce un solo set fijo ("Test Set" / "ts1", 2 cartas, una con precio y otra sin él) —
 * suficiente para probar buscar → elegir → sincronizar sin depender de datos reales.
 * "Fake Pikachu" es variante "normal" (con precio) y "Fake Charizard" es "holo" en
 * solitario (sin normal aparte, como una rara real) — ninguna de las dos duplica fila de
 * variante, para no alterar el recuento de cartas que ya asumen otros tests. */
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
            variant: "normal",
            imageUrl: "https://example.com/ts1-1-small.png",
            imageUrlLarge: "https://example.com/ts1-1-large.png",
            referencePrice: 1.5,
          },
          {
            number: "2",
            name: "Fake Charizard",
            rarity: "Rare Holo",
            variant: "holo",
            imageUrl: "https://example.com/ts1-2-small.png",
            imageUrlLarge: "https://example.com/ts1-2-large.png",
            referencePrice: null,
          },
        ],
      };
    },
  };
}
