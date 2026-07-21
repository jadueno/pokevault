// Duplicado intencional de los tipos del backend (mismo patrón que faro/rumbo/nous):
// mantiene el frontend independiente/buildable por sí solo, sin importar del backend.

export type SealedProductType = "booster_pack" | "booster_box" | "elite_trainer_box" | "bundle" | "tin" | "other";

export interface SealedPurchase {
  id: string;
  productName: string;
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
  photo: string | null;
}

export type NewSealedPurchase = Omit<SealedPurchase, "id">;

export type CardLanguage = "en" | "es" | "fr" | "de" | "it" | "pt" | "ja" | "ko" | "zh-cn" | "zh-tw" | "id" | "th";
export type CardCondition = "mint" | "near_mint" | "excellent" | "good" | "light_played" | "played" | "poor";
export type AcquisitionType = "purchased_single" | "pulled_from_pack" | "trade" | "gift";

export interface CollectionItem {
  id: string;
  name: string;
  setName: string | null;
  number: string | null;
  rarity: string | null;
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
  photo: string | null;
}

export type NewCollectionItem = Omit<CollectionItem, "id">;

export type WishlistPriority = "low" | "medium" | "high";

export interface WishlistItem {
  id: string;
  name: string;
  setName: string | null;
  priority: WishlistPriority;
  maxPrice: number | null;
  targetMonth: string | null;
  notes: string | null;
  photo: string | null;
}

export type NewWishlistItem = Omit<WishlistItem, "id">;

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

export type PlanCategory = "comprar" | "guardar_sellado";

export interface PlanItem {
  id: string;
  month: string;
  category: PlanCategory;
  description: string;
  /** Precio de referencia en euros, campo propio y editable (antes vivía como texto
   * embebido en `description`). */
  referencePrice: number | null;
  /** Término de búsqueda literal para pegar en la tienda, campo propio y editable. */
  searchTerm: string | null;
  done: boolean;
  position: number;
}

export type NewPlanItem = Omit<PlanItem, "id">;

export interface ShoppingLink {
  label: string;
  url: string;
  /** Para qué tipo de compra sirve esta página (p. ej. "cartas sueltas", "producto sellado") —
   * texto libre, se muestra junto al enlace para no tener que recordarlo. */
  note?: string;
}

export interface PlanSettings {
  monthlyBudget: number | null;
  yearRules: string | null;
  yearGoal: string | null;
  shoppingLinks: ShoppingLink[];
}

// ---- Checklist de set (referencia, no catálogo en vivo) ----
// Se sincroniza explícitamente (buscar el set → elegirlo → descargar sus cartas, desde la
// pestaña "Sets" de Mi colección), nunca en segundo plano. "¿qué me falta de este set?" se
// calcula aquí comparando esto con la colección (freeform) por número de carta.

export interface SetChecklist {
  id: string;
  externalSetId: string;
  setName: string;
  setNameEs: string | null;
  totalCards: number;
  syncedAt: string;
}

export interface SetChecklistCard {
  id: string;
  checklistId: string;
  number: string;
  name: string;
  rarity: string | null;
  /** Miniatura, para la rejilla. */
  imageUrl: string | null;
  /** Resolución mayor del mismo proveedor, para el visor a pantalla completa. */
  imageUrlLarge: string | null;
  /** Precio de referencia de Cardmarket en euros, del momento de la sincronización.
   * `null` si el proveedor no tenía precio para esa carta. */
  referencePrice: number | null;
}

/** Un set encontrado al buscar en el proveedor, todavía sin sincronizar — solo para
 * elegir de una lista antes de confirmar la descarga. */
export interface SetSearchCandidate {
  externalSetId: string;
  name: string;
  totalCards: number;
  releaseDate: string | null;
}
