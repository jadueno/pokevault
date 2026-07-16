// ---- Producto sellado ----

export type SealedProductType = "booster_pack" | "booster_box" | "elite_trainer_box" | "bundle" | "tin" | "other";

export interface SealedPurchase {
  id: string;
  productName: string;
  productType: SealedProductType;
  quantity: number;
  purchasePrice: number | null;
  purchaseCurrency: string;
  /** Formato "YYYY-MM-DD", como texto: nunca "date" de Postgres (desfase de zona horaria
   * al leerla de vuelta con `new Date(...).toISOString()`, ver ARCHITECTURE.md). */
  purchaseDate: string | null;
  /** No hay precio de mercado automático: se estima a mano, y la corrección queda
   * identificada como tal (fecha + nota). */
  estimatedValueOverride: number | null;
  estimatedValueOverrideAt: string | null;
  estimatedValueOverrideNote: string | null;
  location: string | null;
  notes: string | null;
  /** Data URL de la foto de la caja/sobre, opcional. */
  photo: string | null;
}

export type NewSealedPurchase = Omit<SealedPurchase, "id">;

// ---- Colección ----

export type CardLanguage = "en" | "es" | "fr" | "de" | "it" | "pt" | "ja" | "ko" | "zh-cn" | "zh-tw" | "id" | "th";
export type CardCondition = "mint" | "near_mint" | "excellent" | "good" | "light_played" | "played" | "poor";
export type AcquisitionType = "purchased_single" | "pulled_from_pack" | "trade" | "gift";

/** Un ejemplar físico que posee el usuario, con sus propios datos (no hay catálogo
 * externo: ver domain/ports.ts VisualMatchProvider — los datos vienen de reconocer una
 * foto, y siempre se revisan/editan a mano antes de guardar). La misma carta puede tener
 * varias filas (distinto idioma, estado, graduación...), cada una con su propio
 * historial de compra. */
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
  /** Solo tiene sentido si acquisitionType='pulled_from_pack'. */
  sealedPurchaseId: string | null;
  /** null si vino de un sobre y no hay precio individual real conocido — nunca se
   * rellena con 0 para no mentir sobre un coste que no se sabe. */
  purchasePrice: number | null;
  purchaseCurrency: string;
  /** Formato "YYYY-MM-DD", como texto (mismo motivo que en SealedPurchase). */
  purchaseDate: string | null;
  isGraded: boolean;
  gradingCompany: string | null;
  grade: number | null;
  /** Sin precio de mercado automático: es la única fuente de valor estimado, siempre
   * identificada con fecha y nota. */
  estimatedValueOverride: number | null;
  estimatedValueOverrideAt: string | null;
  estimatedValueOverrideNote: string | null;
  notes: string | null;
  /** Data URL de la foto de la carta, opcional. */
  photo: string | null;
}

export type NewCollectionItem = Omit<CollectionItem, "id">;

// ---- Wishlist ----

export type WishlistPriority = "low" | "medium" | "high";

export interface WishlistItem {
  id: string;
  name: string;
  setName: string | null;
  priority: WishlistPriority;
  maxPrice: number | null;
  /** Formato "YYYY-MM", null si no tiene mes objetivo asignado. */
  targetMonth: string | null;
  notes: string | null;
  photo: string | null;
}

export type NewWishlistItem = Omit<WishlistItem, "id">;

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

// ---- Reconocimiento de cartas/producto a partir de una foto ----
// Ver domain/ports.ts VisualMatchProvider. Nunca se da de alta nada automáticamente: el
// resultado siempre se muestra en un formulario para revisar/editar antes de guardar.

export type RecognitionConfidence = "high" | "medium" | "low";

export interface RecognizedCardData {
  name: string | null;
  setName: string | null;
  number: string | null;
  rarity: string | null;
  confidence: RecognitionConfidence | null;
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
