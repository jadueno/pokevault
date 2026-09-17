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
  /** Checklist/binder desde el que se marcó como propia (ver "Marcar como mía" en
   * SetChecklistTab) — `null` en altas manuales, ajenas a cualquier checklist. Aísla la
   * pertenencia entre checklists: sin esto, la misma carta real (número+variante) marcada
   * en un checklist aparecía automáticamente como tuya en cualquier otro que la
   * compartiera (p. ej. un Pokémon presente tanto en un set oficial como en un binder que
   * lo reúne desde varias expansiones) — bug real encontrado en producción, 2026-07. */
  checklistId: string | null;
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
  /** Este objeto físico ya está registrado con su precio real en Colección o Sellado (p.
   * ej. una ETB que marcaste "hecho" aquí y también diste de alta en Sellado) — excluye su
   * `referencePrice` de "Invertido" para no sumar el mismo gasto dos veces. */
  countedElsewhere: boolean;
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

export type SetChecklistKind = "official" | "binder";

export interface SetChecklist {
  id: string;
  externalSetId: string;
  setName: string;
  setNameEs: string | null;
  totalCards: number;
  syncedAt: string;
  /** "official": una expansión real sincronizada tal cual. "binder": una colección
   * personalizada con todas las cartas de uno o varios Pokémon, de cualquier expansión
   * donde hayan salido (ver pokemonNames). */
  kind: SetChecklistKind;
  /** Solo si `kind` es "binder": los nombres de Pokémon usados para construirlo, para
   * poder repetir la misma búsqueda al actualizar. `null` en sets oficiales. */
  pokemonNames: string[] | null;
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
  /** Expansión real de origen de esta carta — en un set oficial coincide con el propio
   * set del checklist; en un binder (que mezcla expansiones) es la única forma de saber
   * de cuál viene cada carta. `null` en checklists sincronizados antes de que existiera
   * este campo (se sigue comparando por el nombre del set a nivel de checklist entero). */
  setName: string | null;
  /** Total de cartas de esa expansión de origen (no del checklist entero) — hace falta
   * para el "número/total" real de la carta al marcarla como propia. */
  setTotalCards: number | null;
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
 * (no un set sincronizado) — para el alta manual: usa lo que ha escrito el usuario
 * (nombre/expansión/número) para traer el dato oficial real. */
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
