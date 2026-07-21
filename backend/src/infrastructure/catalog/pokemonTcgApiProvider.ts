import type { PokemonTcgProvider, PokemonTcgSetCandidate, PokemonTcgSetCards } from "../../domain/ports.js";

interface RawCard {
  number: string;
  name: string;
  rarity?: string;
  images?: { small?: string; large?: string };
  cardmarket?: { prices?: { averageSellPrice?: number } };
}

interface RawSet {
  id: string;
  name: string;
  total: number;
  releaseDate?: string;
}

const API_BASE = "https://api.pokemontcg.io/v2";
// La API documenta ~8s de latencia media (y picos bastante mayores) — un límite generoso
// para no colgar el alta si el proveedor tarda mucho, sin esperar indefinidamente.
const TIMEOUT_MS = 10_000;

async function fetchJson<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (process.env.POKEMON_TCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMON_TCG_API_KEY;
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

function toCardData(card: RawCard) {
  return {
    number: card.number,
    name: card.name,
    rarity: card.rarity ?? null,
    imageUrl: card.images?.small ?? null,
    imageUrlLarge: card.images?.large ?? null,
    referencePrice: card.cardmarket?.prices?.averageSellPrice ?? null,
  };
}

export function createPokemonTcgApiProvider(): PokemonTcgProvider {
  return {
    async searchSets(query: string): Promise<PokemonTcgSetCandidate[]> {
      const q = encodeURIComponent(`name:*${query}*`);
      const { data } = await fetchJson<{ data: RawSet[] }>(`${API_BASE}/sets?q=${q}`);
      return data.map((set) => ({
        externalSetId: set.id,
        name: set.name,
        totalCards: set.total,
        releaseDate: set.releaseDate ?? null,
      }));
    },

    async getSetCards(externalSetId: string): Promise<PokemonTcgSetCards> {
      const { data: set } = await fetchJson<{ data: RawSet }>(`${API_BASE}/sets/${externalSetId}`);

      const cards: RawCard[] = [];
      let page = 1;
      for (;;) {
        const { data } = await fetchJson<{ data: RawCard[] }>(
          `${API_BASE}/cards?q=set.id:${externalSetId}&pageSize=250&page=${page}`,
        );
        cards.push(...data);
        if (data.length < 250) break;
        page++;
      }

      return { setName: set.name, totalCards: cards.length, cards: cards.map(toCardData) };
    },
  };
}
