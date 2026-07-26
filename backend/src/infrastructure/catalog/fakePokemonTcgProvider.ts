import type {
  PokemonTcgCardData,
  PokemonTcgCardMatch,
  PokemonTcgCardSearchQuery,
  PokemonTcgProvider,
  PokemonTcgSetCandidate,
  PokemonTcgSetCards,
} from "../../domain/ports.js";

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
            setName: "Test Set",
            setTotalCards: 2,
          },
          {
            number: "2",
            name: "Fake Charizard",
            rarity: "Rare Holo",
            variant: "holo",
            imageUrl: "https://example.com/ts1-2-small.png",
            imageUrlLarge: "https://example.com/ts1-2-large.png",
            referencePrice: null,
            setName: "Test Set",
            setTotalCards: 2,
          },
        ],
      };
    },

    async searchCards({ name }: PokemonTcgCardSearchQuery): Promise<PokemonTcgCardMatch[]> {
      const q = name.toLowerCase();
      // "pikachu": una única coincidencia (caso sin ambigüedad). "charizard": dos
      // coincidencias en expansiones distintas (mismo Pokémon reeditado) para poder
      // probar el selector de candidatos. Cualquier otra cosa: sin resultados.
      if (q.includes("pikachu")) {
        return [
          {
            externalId: "ts1-1",
            number: "1/2",
            name: "Fake Pikachu",
            setName: "Test Set",
            rarity: "Common",
            variant: "normal",
            imageUrl: "https://example.com/ts1-1-small.png",
            imageUrlLarge: "https://example.com/ts1-1-large.png",
            referencePrice: 1.5,
          },
        ];
      }
      if (q.includes("charizard")) {
        return [
          {
            externalId: "ts1-2",
            number: "2/2",
            name: "Fake Charizard",
            setName: "Test Set",
            rarity: "Rare Holo",
            variant: "holo",
            imageUrl: "https://example.com/ts1-2-small.png",
            imageUrlLarge: "https://example.com/ts1-2-large.png",
            referencePrice: 12,
          },
          {
            externalId: "ts2-4",
            number: "4/50",
            name: "Fake Charizard",
            setName: "Otro Set de Prueba",
            rarity: "Rare Holo",
            variant: "holo",
            imageUrl: "https://example.com/ts2-4-small.png",
            imageUrlLarge: "https://example.com/ts2-4-large.png",
            referencePrice: 40,
          },
        ];
      }
      return [];
    },

    async getCardsByPokemonNames(names: string[]): Promise<PokemonTcgCardData[]> {
      const wanted = names.map((n) => n.toLowerCase());
      const cards: PokemonTcgCardData[] = [];
      // Dos cartas de "Fake Slowpoke" en expansiones distintas que comparten el mismo
      // número local ("1") a propósito — para probar que un binder no las confunde entre
      // sí (ver setName/setTotalCards) igual que no confundiría un Slowpoke real de Base
      // Set con uno de otra expansión que también fuese el número 1 de su set.
      if (wanted.some((n) => n.includes("slowpoke"))) {
        cards.push(
          {
            number: "1",
            name: "Fake Slowpoke",
            rarity: "Common",
            variant: "normal",
            imageUrl: "https://example.com/ts1-slowpoke-small.png",
            imageUrlLarge: "https://example.com/ts1-slowpoke-large.png",
            referencePrice: 0.1,
            setName: "Test Set",
            setTotalCards: 2,
          },
          {
            number: "1",
            name: "Fake Slowpoke",
            rarity: "Common",
            variant: "normal",
            imageUrl: "https://example.com/ts2-slowpoke-small.png",
            imageUrlLarge: "https://example.com/ts2-slowpoke-large.png",
            referencePrice: 0.2,
            setName: "Otro Set de Prueba",
            setTotalCards: 50,
          },
        );
      }
      if (wanted.some((n) => n.includes("slowbro"))) {
        cards.push({
          number: "2",
          name: "Fake Slowbro",
          rarity: "Uncommon",
          variant: "holo",
          imageUrl: "https://example.com/ts1-slowbro-small.png",
          imageUrlLarge: "https://example.com/ts1-slowbro-large.png",
          referencePrice: 3,
          setName: "Test Set",
          setTotalCards: 2,
        });
      }
      return cards;
    },
  };
}
