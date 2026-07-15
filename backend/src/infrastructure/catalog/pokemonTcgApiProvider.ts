import type { CatalogProvider, ExternalCatalogCard, ExternalCatalogSet } from "../../domain/ports.js";

const BASE_URL = "https://api.pokemontcg.io/v2";
const PAGE_SIZE = 250;

interface ApiSet {
  id: string;
  name: string;
  series: string | null;
  printedTotal: number | null;
  total: number | null;
  releaseDate: string | null;
  images?: { symbol?: string; logo?: string };
}

interface ApiCardmarketPrices {
  trendPrice?: number;
  averageSellPrice?: number;
}

interface ApiTcgplayerPriceVariant {
  market?: number;
}

interface ApiCard {
  id: string;
  name: string;
  number: string;
  rarity?: string | null;
  artist?: string | null;
  supertype: string;
  subtypes?: string[];
  types?: string[];
  images?: { small?: string; large?: string };
  set: { id: string };
  cardmarket?: { prices?: ApiCardmarketPrices };
  tcgplayer?: { prices?: Record<string, ApiTcgplayerPriceVariant> };
}

interface ApiListResponse<T> {
  data: T[];
  page: number;
  pageSize: number;
  count: number;
  totalCount: number;
}

/** Prioriza el precio de cardmarket (EUR, base de usuarios europea) sobre tcgplayer
 * (USD); etiqueta siempre la moneda explícitamente en vez de asumir una por defecto. */
function extractPrice(card: ApiCard): { amount: number; currency: string } | null {
  const cardmarket = card.cardmarket?.prices;
  const cardmarketPrice = cardmarket?.trendPrice ?? cardmarket?.averageSellPrice;
  if (cardmarketPrice) return { amount: cardmarketPrice, currency: "EUR" };

  const tcgplayerVariants = card.tcgplayer?.prices;
  if (tcgplayerVariants) {
    const firstMarketPrice = Object.values(tcgplayerVariants).find((v) => typeof v.market === "number")?.market;
    if (firstMarketPrice) return { amount: firstMarketPrice, currency: "USD" };
  }
  return null;
}

function toExternalSet(set: ApiSet): ExternalCatalogSet {
  return {
    externalId: set.id,
    name: set.name,
    series: set.series ?? null,
    printedTotal: set.printedTotal ?? null,
    total: set.total ?? null,
    releaseDate: set.releaseDate ?? null,
    symbolUrl: set.images?.symbol ?? null,
    logoUrl: set.images?.logo ?? null,
  };
}

function toExternalCard(card: ApiCard): ExternalCatalogCard {
  return {
    externalId: card.id,
    setExternalId: card.set.id,
    name: card.name,
    number: card.number,
    rarity: card.rarity ?? null,
    artist: card.artist ?? null,
    supertype: card.supertype,
    subtypes: card.subtypes ?? [],
    types: card.types ?? [],
    imageSmallUrl: card.images?.small ?? null,
    imageLargeUrl: card.images?.large ?? null,
    price: extractPrice(card),
  };
}

async function fetchJson<T>(url: string, apiKey: string | undefined): Promise<T> {
  const res = await fetch(url, { headers: apiKey ? { "X-Api-Key": apiKey } : {} });
  if (!res.ok) {
    throw new Error(`pokemontcg.io respondió ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Adaptador real contra la API pública de pokemontcg.io (sin SDK, fetch crudo — misma
 * decisión que anthropicProvider.ts en nous, evitar una dependencia entera por un puñado
 * de llamadas HTTP). Riesgo de proveedor documentado en ARCHITECTURE.md: si el free tier
 * se degrada, este es el único fichero que habría que sustituir.
 */
export function createPokemonTcgApiProvider(apiKey: string | undefined): CatalogProvider {
  return {
    name: "pokemontcg_io",

    async listSets() {
      const sets: ExternalCatalogSet[] = [];
      let page = 1;
      for (;;) {
        const { data } = await fetchJson<ApiListResponse<ApiSet>>(
          `${BASE_URL}/sets?page=${page}&pageSize=${PAGE_SIZE}`,
          apiKey,
        );
        sets.push(...data.map(toExternalSet));
        if (data.length < PAGE_SIZE) break;
        page++;
      }
      return sets;
    },

    async listCardsBySet(setExternalId: string, page = 1) {
      const { data, count } = await fetchJson<ApiListResponse<ApiCard>>(
        `${BASE_URL}/cards?q=set.id:${encodeURIComponent(setExternalId)}&page=${page}&pageSize=${PAGE_SIZE}`,
        apiKey,
      );
      return { cards: data.map(toExternalCard), hasMore: count === PAGE_SIZE };
    },
  };
}
