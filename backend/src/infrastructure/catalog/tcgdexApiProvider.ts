import type { PokemonTcgProvider, PokemonTcgSetCandidate, PokemonTcgSetCards } from "../../domain/ports.js";

// TCGdex (https://tcgdex.dev) en vez de pokemontcg.io: gratis, sin API key, y busca
// directamente en español (comprobado en vivo: `?name=oscuridad` encuentra "Oscuridad
// Absoluta" sin depender de una traducción manual al inglés). También mucho más fiable
// en las pruebas hechas antes de cambiar (84/84 peticiones correctas en paralelo, frente
// al ~45% de error habitual de pokemontcg.io).
const API_BASE = "https://api.tcgdex.net/v2/es";
const TIMEOUT_MS = 10_000;
// El listado de cartas de un set no trae rareza ni precio (solo id/nombre/imagen) — hay
// que pedir cada carta individual para eso. Se piden en paralelo mientras se controla
// cuántas peticiones simultáneas se lanzan, para no bombardear el proveedor de golpe con
// sets grandes (~250 cartas).
const CARD_FETCH_BATCH_SIZE = 25;

interface TcgdexSetSummary {
  id: string;
  name: string;
  cardCount: { total: number };
}

interface TcgdexSetDetail extends TcgdexSetSummary {
  cards: { id: string }[];
}

interface TcgdexCardDetail {
  localId: string;
  name: string;
  rarity?: string;
  image?: string;
  pricing?: { cardmarket?: { trend?: number; avg?: number } };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

function imageUrl(base: string | undefined, quality: "low" | "high"): string | null {
  return base ? `${base}/${quality}.webp` : null;
}

async function fetchCardsInBatches(cardIds: string[]): Promise<TcgdexCardDetail[]> {
  const results: TcgdexCardDetail[] = [];
  for (let i = 0; i < cardIds.length; i += CARD_FETCH_BATCH_SIZE) {
    const batch = cardIds.slice(i, i + CARD_FETCH_BATCH_SIZE);
    const batchResults = await Promise.all(batch.map((id) => fetchJson<TcgdexCardDetail>(`${API_BASE}/cards/${id}`)));
    results.push(...batchResults);
  }
  return results;
}

export function createTcgdexApiProvider(): PokemonTcgProvider {
  return {
    async searchSets(query: string): Promise<PokemonTcgSetCandidate[]> {
      const sets = await fetchJson<TcgdexSetSummary[]>(`${API_BASE}/sets?name=${encodeURIComponent(query)}`);
      return sets.map((set) => ({
        externalSetId: set.id,
        name: set.name,
        totalCards: set.cardCount.total,
        // El listado de búsqueda no trae fecha de lanzamiento (solo el detalle del set sí) —
        // no compensa una petición extra por candidato solo para un dato cosmético.
        releaseDate: null,
      }));
    },

    async getSetCards(externalSetId: string): Promise<PokemonTcgSetCards> {
      const set = await fetchJson<TcgdexSetDetail>(`${API_BASE}/sets/${externalSetId}`);
      const cards = await fetchCardsInBatches(set.cards.map((c) => c.id));

      return {
        setName: set.name,
        totalCards: cards.length,
        cards: cards.map((card) => ({
          number: card.localId,
          name: card.name,
          rarity: card.rarity ?? null,
          imageUrl: imageUrl(card.image, "low"),
          imageUrlLarge: imageUrl(card.image, "high"),
          referencePrice: card.pricing?.cardmarket?.trend ?? card.pricing?.cardmarket?.avg ?? null,
        })),
      };
    },
  };
}
