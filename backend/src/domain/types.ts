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
export type AcquisitionType = "purchased_single" | "pulled_from_pack" | "trade" | "gift" | "promotional";
/** Variante de impresión de una misma carta: "reverse" (reverso/foil) es la parada
 * habitual en la mayoría de comunes/infrecuentes de sets modernos; "holo" cuando la
 * única versión que existe ya es holo (raras/full art), sin versión normal aparte. Cada
 * variante es un objeto físico distinto, igual que ya lo son las cartas graduadas. */
export type CardVariant = "normal" | "reverse" | "holo";

/** Un ejemplar físico que posee el usuario, con sus propios datos (no hay catálogo
 * externo salvo el checklist de set opcional, ver SetChecklist más abajo — el resto se
 * rellena a mano). La misma carta puede tener varias filas (distinto idioma, estado,
 * graduación...), cada una con su propio historial de compra. */
export interface CollectionItem {
  id: string;
  name: string;
  setName: string | null;
  number: string | null;
  rarity: string | null;
  /** "normal" para todo lo ya existente antes de que se distinguiera (y para la inmensa
   * mayoría de altas manuales, donde no aporta nada preguntarlo). */
  variant: CardVariant;
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

// ---- Plan de compra mensual ----
// Lista de tareas de texto libre, distinta de la wishlist: la mayoría de ítems del plan
// real del usuario no son una carta de catálogo concreta (accesorios, cantidades por
// rareza, sellado, o "una carta de entre varias opciones"). "done" es una casilla
// independiente de "Ya la tengo": no exige idioma/estado/precio ni cuenta en el dashboard.

export type PlanCategory = "comprar" | "guardar_sellado";

export interface PlanItem {
  id: string;
  /** Formato "YYYY-MM". */
  month: string;
  category: PlanCategory;
  description: string;
  /** Precio de referencia en euros, campo propio (antes vivía como texto embebido en
   * `description`, p. ej. "(ref. ~59 €)") — editable como cualquier otro campo. */
  referencePrice: number | null;
  /** Término de búsqueda literal para pegar en la tienda (antes embebido como
   * "— buscar: "...""). */
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
// Se sincroniza explícitamente (buscar el set → elegirlo → descargar sus cartas, ver
// domain/ports.ts PokemonTcgProvider), nunca en segundo plano. "¿qué cartas tiene este
// set y cuáles me faltan?" se calcula en el frontend comparando esto con
// collection_items (freeform) por número de carta.

export type SetChecklistKind = "official" | "binder";

export interface SetChecklist {
  id: string;
  externalSetId: string;
  setName: string;
  setNameEs: string | null;
  totalCards: number;
  syncedAt: string;
  /** "official": un set/expansión real sincronizado tal cual. "binder": una colección
   * personalizada con todas las cartas de uno o varios Pokémon, de cualquier expansión
   * donde hayan salido (ver pokemonNames). */
  kind: SetChecklistKind;
  /** Solo si `kind` es "binder": los nombres de Pokémon usados para construirlo, para
   * poder repetir la misma búsqueda al actualizar (resync). `null` en sets oficiales. */
  pokemonNames: string[] | null;
}

export interface SetChecklistCard {
  id: string;
  checklistId: string;
  number: string;
  name: string;
  rarity: string | null;
  /** Una fila por cada variante que exista de la carta (p. ej. "normal" y "reverse" por
   * separado, cada una con su propio precio) — no una columna "tiene foil" en la misma
   * fila, para que cada variante se pueda marcar como tuya/te falta de forma
   * independiente, igual que dos objetos físicos distintos. */
  variant: CardVariant;
  /** Miniatura, para la rejilla. */
  imageUrl: string | null;
  /** Resolución mayor del mismo proveedor, para el visor a pantalla completa — sin esto,
   * ampliar la miniatura se vería pixelado. */
  imageUrlLarge: string | null;
  /** Precio de referencia de Cardmarket en euros, del momento de la sincronización — ver
   * la migración 1784000000013. `null` si el proveedor no tenía precio para esa carta. */
  referencePrice: number | null;
  /** Expansión real de origen de esta carta concreta — en un set oficial coincide con el
   * set del propio checklist; en un binder (que mezcla expansiones) es la única forma de
   * saber de cuál viene cada carta. `null` en checklists sincronizados antes de que
   * existiera este campo (ver migración 1784000000015). */
  setName: string | null;
  /** Total de cartas de esa expansión de origen (no del checklist entero) — hace falta
   * para reconstruir el "número/total" real de la carta al marcarla como propia; usar el
   * total del checklist daría un denominador incorrecto en un binder. */
  setTotalCards: number | null;
}

// ---- Reconocimiento de fotos (carta/caja -> datos sugeridos) ----
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
 * TCGdex no indexa), el usuario puede subir en su lugar una captura de la página de esa
 * carta en Cardmarket: mismo reconocimiento por IA, pero leyendo una interfaz web en vez
 * de una foto física. Sin número de carta: Cardmarket no lo muestra en esa página. */
export interface RecognizedPriceData {
  name: string | null;
  setName: string | null;
  rarity: string | null;
  referencePrice: number | null;
}
