import type {
  CardVariant,
  CollectionItem,
  NewCollectionItem,
  NewPlanItem,
  NewSealedPurchase,
  NewWishlistItem,
  PlanItem,
  PlanSettings,
  SealedPurchase,
  SetChecklist,
  SetChecklistCard,
  SetChecklistKind,
  WishlistItem,
} from "./types.js";

export interface Repository<T, TNew> {
  list(): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  create(entity: TNew): Promise<T>;
  update(id: string, entity: TNew): Promise<T | null>;
  remove(id: string): Promise<boolean>;
}

export type SealedPurchaseRepository = Repository<SealedPurchase, NewSealedPurchase>;
export type CollectionItemRepository = Repository<CollectionItem, NewCollectionItem>;
export type WishlistItemRepository = Repository<WishlistItem, NewWishlistItem>;
export type PlanItemRepository = Repository<PlanItem, NewPlanItem>;

export interface PlanSettingsRepository {
  get(): Promise<PlanSettings>;
  update(entity: PlanSettings): Promise<PlanSettings>;
}

// ---- Checklist de set ----

export interface UpsertChecklistInput {
  externalSetId: string;
  setName: string;
  setNameEs: string | null;
  cards: PokemonTcgCardData[];
  kind: SetChecklistKind;
  /** Solo si `kind` es "binder" — ver SetChecklist.pokemonNames. */
  pokemonNames: string[] | null;
}

export interface SetChecklistRepository {
  list(): Promise<SetChecklist[]>;
  findById(id: string): Promise<SetChecklist | null>;
  findByExternalId(externalSetId: string): Promise<SetChecklist | null>;
  getCards(checklistId: string): Promise<SetChecklistCard[]>;
  /** Reemplazo completo (borra y vuelve a insertar) — usado tanto al sincronizar un set
   * nuevo como al "Actualizar" uno ya existente (mismo externalSetId). */
  upsertChecklist(input: UpsertChecklistInput): Promise<SetChecklist>;
}

// ---- Proveedor de datos de set de Pokémon TCG (puerto intercambiable) ----
// El dominio/aplicación nunca depende directamente del proveedor externo — solo de esta
// forma. Mismo patrón que el proveedor de LLM/embeddings de "nous": adaptador real
// (TCGdex, ver infrastructure/catalog/tcgdexApiProvider.ts) + fake determinista para
// tests. Aunque TCGdex es bastante más fiable que pokemontcg.io (el proveedor anterior,
// con ~45% de error y ~8s de latencia media documentados en ARCHITECTURE.md), sigue sin
// llamarse nunca en segundo plano ni en cada carga de la app — solo en acciones
// explícitas del usuario (buscar/sincronizar un set).

export interface PokemonTcgSetCandidate {
  externalSetId: string;
  name: string;
  totalCards: number;
  releaseDate: string | null;
}

export interface PokemonTcgCardData {
  number: string;
  name: string;
  rarity: string | null;
  /** Una entrada por cada variante de impresión que tenga la carta (ver CardVariant) —
   * un mismo número puede aparecer más de una vez en `PokemonTcgSetCards.cards`. */
  variant: CardVariant;
  imageUrl: string | null;
  imageUrlLarge: string | null;
  referencePrice: number | null;
  /** Expansión real de origen de esta carta — en `getSetCards` coincide siempre con el
   * propio set pedido; en `getCardsByPokemonNames` (un binder mezcla expansiones) es la
   * única forma de saber de cuál viene cada carta. */
  setName: string;
  /** Total de cartas de esa expansión de origen — hace falta para el "número/total" real
   * de la carta, que en un binder es distinto del total del binder entero. */
  setTotalCards: number;
}

export interface PokemonTcgSetCards {
  setName: string;
  totalCards: number;
  cards: PokemonTcgCardData[];
}

/** Una carta concreta encontrada al buscar por nombre (across todos los sets del
 * proveedor, no uno sincronizado) — para el alta manual: el usuario escribe
 * nombre/expansión/número a mano y esto trae el dato oficial real en vez de quedarse solo
 * con el texto libre que haya escrito. */
export interface PokemonTcgCardMatch {
  externalId: string;
  /** Formato "N/total" (p. ej. "2/120"), igual que el resto de números de carta de la
   * app — no solo el número dentro del set. */
  number: string;
  name: string;
  setName: string;
  rarity: string | null;
  /** Variante "principal" de la carta (normal si existe, si no la única que haya) — el
   * usuario puede cambiarla a mano en el formulario tras elegir la carta. */
  variant: CardVariant;
  imageUrl: string | null;
  imageUrlLarge: string | null;
  referencePrice: number | null;
}

export interface PokemonTcgCardSearchQuery {
  name: string;
  setName?: string | null;
  number?: string | null;
}

export interface PokemonTcgProvider {
  searchSets(query: string): Promise<PokemonTcgSetCandidate[]>;
  getSetCards(externalSetId: string): Promise<PokemonTcgSetCards>;
  /** Busca cartas concretas por nombre (+ pistas opcionales de expansión/número para
   * acotar) en todo el catálogo del proveedor — no requiere que el set esté sincronizado.
   * Puede devolver varias si el nombre es ambiguo (mismo Pokémon en varias expansiones):
   * el usuario elige, nunca se asume la primera. */
  searchCards(query: PokemonTcgCardSearchQuery): Promise<PokemonTcgCardMatch[]>;
  /** Todas las cartas de uno o varios Pokémon concretos, de cualquier expansión donde
   * hayan salido — para construir un "binder" personalizado (ver SetChecklist.kind).
   * A diferencia de `getSetCards`, las cartas devueltas pueden venir de expansiones
   * distintas entre sí (por eso cada una lleva su propio setName/setTotalCards). */
  getCardsByPokemonNames(names: string[]): Promise<PokemonTcgCardData[]>;
}
