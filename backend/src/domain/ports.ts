import type {
  CardSearchFilters,
  CatalogCard,
  CatalogSet,
  CatalogSyncLog,
  CatalogSyncStatus,
  CollectionItem,
  NewCollectionItem,
  NewPlanItem,
  NewSealedPurchase,
  NewWishlistItem,
  PlanItem,
  PlanSettings,
  SealedPurchase,
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

export interface CatalogRepository {
  listSets(): Promise<CatalogSet[]>;
  searchCards(filters: CardSearchFilters): Promise<CatalogCard[]>;
  getCard(id: string): Promise<CatalogCard | null>;
  getCardsByIds(ids: string[]): Promise<CatalogCard[]>;
  upsertSet(provider: string, set: ExternalCatalogSet): Promise<CatalogSet>;
  upsertCard(provider: string, setId: string, card: ExternalCatalogCard): Promise<CatalogCard>;
  createSyncLog(provider: string): Promise<CatalogSyncLog>;
  finishSyncLog(
    id: string,
    result: { status: CatalogSyncStatus; setsSynced?: number; cardsSynced?: number; error?: string },
  ): Promise<void>;
}

// ---- Proveedor de catálogo externo (puerto intercambiable) ----
// El dominio/aplicación nunca depende de pokemontcg.io directamente: solo de estas
// formas. Riesgo de proveedor ya documentado (ver ARCHITECTURE.md): si el free tier de
// pokemontcg.io se degrada, sustituir el adaptador es el único cambio necesario.

export interface ExternalCatalogSet {
  externalId: string;
  name: string;
  series: string | null;
  printedTotal: number | null;
  total: number | null;
  releaseDate: string | null;
  symbolUrl: string | null;
  logoUrl: string | null;
}

export interface ExternalCatalogCard {
  externalId: string;
  setExternalId: string;
  name: string;
  number: string;
  rarity: string | null;
  artist: string | null;
  supertype: string;
  subtypes: string[];
  types: string[];
  imageSmallUrl: string | null;
  imageLargeUrl: string | null;
  price: { amount: number; currency: string } | null;
}

export interface CatalogProvider {
  /** Identifica al proveedor en la columna `provider` de catalog_sets/catalog_cards. */
  readonly name: string;
  listSets(): Promise<ExternalCatalogSet[]>;
  listCardsBySet(setExternalId: string, page?: number): Promise<{ cards: ExternalCatalogCard[]; hasMore: boolean }>;
}

/** Valor estimado de un ejemplar: la corrección manual del usuario gana siempre sobre
 * el precio de catálogo. null si ninguno de los dos se conoce (nunca se trata como 0). */
export function resolveItemEstimatedValue(
  item: { estimatedValueOverride: number | null },
  card: { currentPrice: number | null },
): number | null {
  return item.estimatedValueOverride ?? card.currentPrice;
}
