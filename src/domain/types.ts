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
export type AcquisitionType = "purchased_single" | "pulled_from_pack" | "trade" | "gift" | "promotional";
/** Variante de impresión de una misma carta: "reverse" (reverso/foil) es la habitual en
 * la mayoría de comunes/infrecuentes de sets modernos; "holo" cuando la única versión
 * que existe ya es holo (raras/full art), sin versión normal aparte. Cada variante es un
 * objeto físico distinto, igual que ya lo son las cartas graduadas. */
export type CardVariant = "normal" | "reverse" | "holo";

export interface CollectionItem {
  id: string;
  name: string;
  setName: string | null;
  number: string | null;
  rarity: string | null;
  /** "normal" para todo lo que no distingue variante (la inmensa mayoría de altas
   * manuales). */
  variant: CardVariant;
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
  /** Una fila por cada variante que exista de la carta (normal/reverso/holo), cada una
   * con su propio precio — no una columna "tiene foil" en la misma fila, para que cada
   * variante se pueda marcar como tuya/te falta de forma independiente. */
  variant: CardVariant;
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

/** Una carta concreta encontrada al buscar por nombre en todo el catálogo del proveedor
 * (no un set sincronizado) — para el alta manual asistida por foto: usa lo que reconoce
 * la IA (nombre/expansión/número) para traer el dato oficial real. */
export interface CardSearchMatch {
  externalId: string;
  number: string;
  name: string;
  setName: string;
  rarity: string | null;
  variant: CardVariant;
  imageUrl: string | null;
  imageUrlLarge: string | null;
  referencePrice: number | null;
}

// ---- Reconocimiento de fotos (carta -> datos sugeridos) ----
// Ayuda a rellenar el alta manual de una carta que no está en ningún set sincronizado —
// nunca alta automática: el resultado siempre se revisa/edita a mano antes de guardar.

export type RecognitionConfidence = "high" | "medium" | "low";

export interface RecognizedCardData {
  name: string | null;
  setName: string | null;
  number: string | null;
  rarity: string | null;
  /** Si la foto deja ver claramente el brillo holográfico/reverso del acabado, o si es un
   * impreso liso — null si no se puede distinguir por la foto. */
  variant: CardVariant | null;
  /** Idioma del texto impreso en la carta, deducido de la foto — null si no es legible. */
  language: CardLanguage | null;
  confidence: RecognitionConfidence | null;
}

/** Cuando la carta no está en el catálogo del proveedor (p. ej. una promo regional que
 * TCGdex no indexa), se puede subir en su lugar una captura de su página en Cardmarket:
 * mismo reconocimiento por IA, pero leyendo una interfaz web en vez de una foto física.
 * Sin número de carta: Cardmarket no lo muestra en esa página. */
export interface RecognizedPriceData {
  name: string | null;
  setName: string | null;
  rarity: string | null;
  referencePrice: number | null;
}
