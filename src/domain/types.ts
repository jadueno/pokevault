// Duplicado intencional de los tipos del backend (mismo patrón que faro/rumbo/nous):
// mantiene el frontend independiente/buildable por sí solo, sin importar del backend.

export interface CatalogSet {
  id: string;
  provider: string;
  externalId: string;
  name: string;
  series: string | null;
  printedTotal: number | null;
  total: number | null;
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
  priceUpdatedAt: string | null;
  priceSource: string | null;
}

export interface CardSearchFilters {
  q?: string;
  setId?: string;
  rarity?: string;
  page?: number;
}

export type SealedProductType = "booster_pack" | "booster_box" | "elite_trainer_box" | "bundle" | "tin" | "other";

export interface SealedPurchase {
  id: string;
  productName: string;
  catalogSetId: string | null;
  productType: SealedProductType;
  quantity: number;
  purchasePrice: number | null;
  purchaseCurrency: string;
  purchaseDate: string | null;
  estimatedValueOverride: number | null;
  estimatedValueOverrideAt: string | null;
  estimatedValueOverrideNote: string | null;
  location: string | null;
  notes: string | null;
}

export type NewSealedPurchase = Omit<SealedPurchase, "id">;

export type CardLanguage = "en" | "es" | "fr" | "de" | "it" | "pt" | "ja" | "ko" | "zh-cn" | "zh-tw" | "id" | "th";
export type CardCondition = "mint" | "near_mint" | "excellent" | "good" | "light_played" | "played" | "poor";
export type AcquisitionType = "purchased_single" | "pulled_from_pack" | "trade" | "gift";

export interface CollectionItem {
  id: string;
  catalogCardId: string;
  language: CardLanguage;
  condition: CardCondition;
  quantity: number;
  acquisitionType: AcquisitionType;
  sealedPurchaseId: string | null;
  purchasePrice: number | null;
  purchaseCurrency: string;
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

export interface CollectionItemWithCard extends CollectionItem {
  card: CatalogCard;
}

export type WishlistPriority = "low" | "medium" | "high";

export interface WishlistItem {
  id: string;
  catalogCardId: string;
  priority: WishlistPriority;
  maxPrice: number | null;
  targetMonth: string | null;
  notes: string | null;
}

export type NewWishlistItem = Omit<WishlistItem, "id">;

export interface WishlistItemWithCard extends WishlistItem {
  card: CatalogCard;
}

export interface MoveToCollectionDetails {
  language: CardLanguage;
  condition: CardCondition;
  quantity: number;
  purchasePrice: number | null;
  purchaseCurrency: string;
  purchaseDate: string | null;
  notes: string | null;
}

export interface CollectionSummary {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  itemsWithoutValue: number;
  totalInvested: number;
}

export type PlanCategory = "comprar" | "abrir" | "guardar_sellado";

export interface PlanItem {
  id: string;
  month: string;
  category: PlanCategory;
  description: string;
  done: boolean;
  position: number;
}

export type NewPlanItem = Omit<PlanItem, "id">;

export interface ShoppingLink {
  label: string;
  url: string;
}

export interface PlanSettings {
  monthlyBudget: number | null;
  yearRules: string | null;
  yearGoal: string | null;
  shoppingLinks: ShoppingLink[];
}
