import type { CardVariant } from "../../domain/types.js";
import type { PokemonTcgCardData, PokemonTcgProvider, PokemonTcgSetCandidate, PokemonTcgSetCards } from "../../domain/ports.js";

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
  // Qué versiones de impresión existen de esta carta — no todas tienen las tres (la
  // inmensa mayoría de comunes/infrecuentes de sets modernos tienen normal+reverse; las
  // raras/full art suelen ser solo holo, sin versión normal aparte).
  variants?: { normal?: boolean; reverse?: boolean; holo?: boolean };
  pricing?: {
    cardmarket?: {
      trend?: number;
      avg?: number;
      // TCGdex mete el precio de "la otra versión" (reverso o holo, la que no sea la
      // base) bajo el sufijo "-holo" de Cardmarket, exista o no una versión "holo" de
      // verdad — Cardmarket solo tiene dos categorías de precio (normal/holo), TCGdex no
      // añade una tercera para "reverso".
      "trend-holo"?: number;
      "avg-holo"?: number;
    };
  };
}

/** De las variantes que trae el proveedor, a qué precio corresponde cada una: la primera
 * variante detectada (normalmente "normal") usa el precio base de Cardmarket; el resto
 * (reverso u holo en solitario) usa el precio "-holo" — ver el comentario de
 * TcgdexCardDetail.pricing más arriba sobre por qué ese sufijo cubre ambos casos. Sin
 * variantes declaradas (no debería pasar, pero el proveedor externo no lo garantiza), se
 * asume "normal" antes que perder la carta entera del checklist. */
function cardVariantPrices(card: TcgdexCardDetail): { variant: CardVariant; price: number | null }[] {
  const kinds: CardVariant[] = [];
  if (card.variants?.normal) kinds.push("normal");
  if (card.variants?.reverse) kinds.push("reverse");
  if (card.variants?.holo && !card.variants?.reverse) kinds.push("holo");
  if (kinds.length === 0) kinds.push("normal");

  const cm = card.pricing?.cardmarket;
  const basePrice = cm?.trend ?? cm?.avg ?? null;
  const foilPrice = cm?.["trend-holo"] ?? cm?.["avg-holo"] ?? null;

  return kinds.map((variant, i) => ({ variant, price: i === 0 ? basePrice : foilPrice }));
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

      // totalCards cuenta cartas del set (una por número), no filas de variante: una
      // misma carta con normal+reverso aporta dos entradas a `cards` más abajo, pero
      // sigue siendo una sola carta del set.
      return {
        setName: set.name,
        totalCards: cards.length,
        cards: cards.flatMap((card): PokemonTcgCardData[] =>
          cardVariantPrices(card).map(({ variant, price }) => ({
            number: card.localId,
            name: card.name,
            rarity: card.rarity ?? null,
            variant,
            imageUrl: imageUrl(card.image, "low"),
            imageUrlLarge: imageUrl(card.image, "high"),
            referencePrice: price,
          })),
        ),
      };
    },
  };
}
