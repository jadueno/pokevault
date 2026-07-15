// ---- Catálogo: espejo local del proveedor externo (ver domain/ports.ts: CatalogProvider) ----

export interface CatalogSet {
  id: string;
  provider: string;
  externalId: string;
  name: string;
  series: string | null;
  printedTotal: number | null;
  total: number | null;
  /** Formato "YYYY-MM-DD", como texto (ver migración: nunca "date" de Postgres, para
   * no arrastrar el desfase de zona horaria al leerla de vuelta). */
  releaseDate: string | null;
  symbolUrl: string | null;
  logoUrl: string | null;
}

export interface CatalogCard {
  id: string;
  provider: string;
  externalId: string;
  setId: string;
  name: string;
  number: string;
  rarity: string | null;
  artist: string | null;
  supertype: string;
  subtypes: string[];
  types: string[];
  imageSmallUrl: string | null;
  imageLargeUrl: string | null;
  currentPrice: number | null;
  currentPriceCurrency: string | null;
  /** ISO 8601. Regla de negocio: siempre se muestra junto a priceSource, nunca a solas. */
  priceUpdatedAt: string | null;
  priceSource: string | null;
}

export type CatalogSyncStatus = "running" | "success" | "failed";

export interface CatalogSyncLog {
  id: string;
  provider: string;
  startedAt: string;
  finishedAt: string | null;
  status: CatalogSyncStatus;
  setsSynced: number | null;
  cardsSynced: number | null;
  error: string | null;
}

export interface CardSearchFilters {
  query?: string;
  setId?: string;
  rarity?: string;
  page?: number;
  pageSize?: number;
}

// ---- Producto sellado ----

export type SealedProductType = "booster_pack" | "booster_box" | "elite_trainer_box" | "bundle" | "tin" | "other";

export interface SealedPurchase {
  id: string;
  productName: string;
  catalogSetId: string | null;
  productType: SealedProductType;
  quantity: number;
  purchasePrice: number | null;
  purchaseCurrency: string;
  /** Formato "YYYY-MM-DD", como texto (mismo motivo que CatalogSet.releaseDate). */
  purchaseDate: string | null;
  /** No hay precio de mercado automático para sellado: se estima a mano, y la
   * corrección queda identificada como tal (fecha + nota), igual que en CollectionItem. */
  estimatedValueOverride: number | null;
  estimatedValueOverrideAt: string | null;
  estimatedValueOverrideNote: string | null;
  location: string | null;
  notes: string | null;
}

export type NewSealedPurchase = Omit<SealedPurchase, "id">;

// ---- Colección ----

export type CardLanguage = "en" | "es" | "fr" | "de" | "it" | "pt" | "ja" | "ko" | "zh-cn" | "zh-tw" | "id" | "th";
export type CardCondition = "mint" | "near_mint" | "excellent" | "good" | "light_played" | "played" | "poor";
export type AcquisitionType = "purchased_single" | "pulled_from_pack" | "trade" | "gift";

/** Un ejemplar físico que posee el usuario — no la carta de catálogo en sí. La misma
 * carta puede tener varias filas (distinto idioma, estado, graduación...), cada una con
 * su propio historial de compra. */
export interface CollectionItem {
  id: string;
  catalogCardId: string;
  language: CardLanguage;
  condition: CardCondition;
  quantity: number;
  acquisitionType: AcquisitionType;
  /** Solo tiene sentido si acquisitionType='pulled_from_pack'. */
  sealedPurchaseId: string | null;
  /** null si vino de un sobre y no hay precio individual real conocido — nunca se
   * rellena con 0 para no mentir sobre un coste que no se sabe. */
  purchasePrice: number | null;
  purchaseCurrency: string;
  /** Formato "YYYY-MM-DD", como texto (mismo motivo que CatalogSet.releaseDate). */
  purchaseDate: string | null;
  isGraded: boolean;
  gradingCompany: string | null;
  grade: number | null;
  estimatedValueOverride: number | null;
  estimatedValueOverrideAt: string | null;
  estimatedValueOverrideNote: string | null;
  notes: string | null;
}

export type NewCollectionItem = Omit<CollectionItem, "id">;

// ---- Wishlist ----

export type WishlistPriority = "low" | "medium" | "high";

export interface WishlistItem {
  id: string;
  catalogCardId: string;
  priority: WishlistPriority;
  maxPrice: number | null;
  /** Formato "YYYY-MM", null si no tiene mes objetivo asignado. */
  targetMonth: string | null;
  notes: string | null;
}

export type NewWishlistItem = Omit<WishlistItem, "id">;

// ---- Vistas compuestas para la UI (join hecho en application/, no en el repositorio) ----

export interface CollectionItemWithCard extends CollectionItem {
  card: CatalogCard;
}

export interface WishlistItemWithCard extends WishlistItem {
  card: CatalogCard;
}

export interface CollectionSummary {
  totalItems: number;
  totalQuantity: number;
  /** Suma de valor estimado × cantidad de cada ejemplar con valor conocido. */
  totalValue: number;
  /** Cuántos ejemplares no entran en totalValue por no tener valor estimado conocido
   * (regla de negocio: no tratar "sin precio" como valor cero silenciosamente). */
  itemsWithoutValue: number;
  totalInvested: number;
}

// ---- Plan de compra mensual ----
// Lista de tareas de texto libre, distinta de la wishlist: la mayoría de ítems del plan
// real del usuario no son una carta de catálogo concreta (accesorios, cantidades por
// rareza, sellado, o "una carta de entre varias opciones"). "done" es una casilla
// independiente de "Ya la tengo": no exige idioma/estado/precio ni cuenta en el dashboard.

export type PlanCategory = "comprar" | "abrir" | "guardar_sellado";

export interface PlanItem {
  id: string;
  /** Formato "YYYY-MM". */
  month: string;
  category: PlanCategory;
  description: string;
  done: boolean;
  position: number;
}

export type NewPlanItem = Omit<PlanItem, "id">;

export interface PlanSettings {
  monthlyBudget: number | null;
  yearRules: string | null;
  yearGoal: string | null;
}
