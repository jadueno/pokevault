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
  WishlistItem,
} from "./types.js";

export interface Repository<T, TNew> {
  list(): Promise<T[]>;
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
}

export interface SetChecklistRepository {
  list(): Promise<SetChecklist[]>;
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
}

export interface PokemonTcgSetCards {
  setName: string;
  totalCards: number;
  cards: PokemonTcgCardData[];
}

export interface PokemonTcgProvider {
  searchSets(query: string): Promise<PokemonTcgSetCandidate[]>;
  getSetCards(externalSetId: string): Promise<PokemonTcgSetCards>;
}
