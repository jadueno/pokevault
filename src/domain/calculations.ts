import type {
  CardVariant,
  CollectionItem,
  PlanCategory,
  PlanItem,
  SealedPurchase,
  SetChecklist,
  SetChecklistCard,
  WishlistItem,
} from "./types";

export function formatMoney(amount: number | null, currency = "EUR"): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount);
}

/** "2026-08" -> "Agosto 2026". Compartido por Wishlist y Plan, las dos pantallas que
 * agrupan por mes en formato "YYYY-MM". */
export function monthLabel(month: string | null): string {
  if (!month) return "Sin mes objetivo";
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  const label = date.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export interface WishlistMonthGroup {
  /** null = sin mes objetivo asignado, siempre al final. */
  month: string | null;
  items: WishlistItem[];
}

/** Agrupa la wishlist por mes objetivo: es la pantalla de planificación de compra
 * mensual ("en agosto esto, en septiembre esto otro") pedida por el usuario, sin
 * necesitar una tabla nueva — target_month ya vive en cada elemento de la wishlist. */
export function groupWishlistByMonth(items: WishlistItem[]): WishlistMonthGroup[] {
  const groups = new Map<string | null, WishlistItem[]>();
  for (const item of items) {
    const list = groups.get(item.targetMonth) ?? [];
    list.push(item);
    groups.set(item.targetMonth, list);
  }
  const sortedMonths = [...groups.keys()].filter((m): m is string => m !== null).sort();
  const result: WishlistMonthGroup[] = sortedMonths.map((month) => ({ month, items: groups.get(month)! }));
  const withoutMonth = groups.get(null);
  if (withoutMonth) result.push({ month: null, items: withoutMonth });
  return result;
}

export const PLAN_CATEGORIES: PlanCategory[] = ["comprar", "guardar_sellado"];
export const PLAN_CATEGORY_LABELS: Record<PlanCategory, string> = {
  comprar: "Comprar",
  guardar_sellado: "Guardar sellado",
};

export interface PlanMonthGroup {
  month: string;
  byCategory: Record<PlanCategory, PlanItem[]>;
}

/** Agrupa el plan de compra mensual por mes (orden cronológico) y, dentro de cada mes,
 * por categoría en el orden fijo comprar/guardar_sellado del propio plan. */
export function groupPlanByMonth(items: PlanItem[]): PlanMonthGroup[] {
  const months = new Map<string, PlanItem[]>();
  for (const item of items) {
    const list = months.get(item.month) ?? [];
    list.push(item);
    months.set(item.month, list);
  }
  return [...months.keys()].sort().map((month) => {
    const monthItems = months.get(month)!;
    const byCategory = Object.fromEntries(
      PLAN_CATEGORIES.map((category) => [
        category,
        monthItems.filter((i) => i.category === category).sort((a, b) => a.position - b.position),
      ]),
    ) as Record<PlanCategory, PlanItem[]>;
    return { month, byCategory };
  });
}

export interface PlanMonthEstimate {
  /** Suma de `referencePrice` de los ítems de "comprar" (no "guardar_sellado": eso ya es
   * tuyo, no es un gasto nuevo del mes). Solo cuenta lo que tiene precio puesto. */
  amount: number;
  /** Cuántos ítems de "comprar" tienen precio de referencia puesto. */
  pricedCount: number;
  doneCount: number;
  totalCount: number;
}

/** Progreso ("X/Y hechos") y total gastado ("123 €") de un mes del plan, para poder
 * mostrar de un vistazo si un mes se está pasando del presupuesto mensual. */
export function estimatePlanMonth(group: PlanMonthGroup): PlanMonthEstimate {
  let amount = 0;
  let pricedCount = 0;
  let doneCount = 0;
  let totalCount = 0;
  for (const category of PLAN_CATEGORIES) {
    for (const item of group.byCategory[category]) {
      totalCount++;
      if (item.done) doneCount++;
      if (category === "guardar_sellado") continue;
      if (item.referencePrice !== null) {
        amount += item.referencePrice;
        pricedCount++;
      }
    }
  }
  return { amount, pricedCount, doneCount, totalCount };
}

/** Suma de `referencePrice` de los ítems de "comprar" ya marcados como hechos, de todos
 * los meses — lo que el plan dice que ya has comprado de verdad, no solo lo previsto.
 * "guardar_sellado" no cuenta (mismo motivo que en `estimatePlanMonth`: ya era tuyo, no
 * es un gasto nuevo). Se suma al "Invertido" del Resumen porque bastantes ítems del plan
 * (accesorios, cantidades por rareza) nunca llegan a tener su propia fila en
 * `collection_items`/`sealed_purchases`, así que sin esto ese gasto real no se vería en
 * ningún sitio.
 *
 * `countedElsewhere` también se excluye aquí (a diferencia de `estimatePlanMonth`, que sí
 * lo cuenta: ahí no se combina con ningún otro dato). Cuando el mismo objeto físico SÍ
 * tiene su propia fila en `collection_items`/`sealed_purchases` (lo normal: marcas "hecho"
 * el ítem del plan Y registras la compra real para llevar su valor de mercado), su coste
 * ya llega a "Invertido" por ese otro lado — sumarlo también aquí lo contaba dos veces
 * (bug real detectado 2026-09-17: una ETB de 55,90 € y otra de 200 €/180 € se sumaban por
 * partida doble). */
export function totalPlanInvested(items: PlanItem[]): number {
  let total = 0;
  for (const item of items) {
    if (item.category === "comprar" && item.done && item.referencePrice !== null && !item.countedElsewhere) {
      total += item.referencePrice;
    }
  }
  return total;
}

/** Cuántas cartas físicas de la colección están vinculadas a un sobre/caja de producto
 * sellado concreto (suma `quantity`, no nº de filas — dos filas de x1 y una de x3 del mismo
 * sobre son 5 cartas, no 3 filas) — para poder repartir su coste de compra entre ellas. */
export function countLinkedCollectionItems(sealedPurchaseId: string, items: CollectionItem[]): number {
  return items.reduce((count, item) => (item.sealedPurchaseId === sealedPurchaseId ? count + item.quantity : count), 0);
}

/** Coste estimado por carta repartiendo el precio de compra del sobre entre las cartas que
 * se le han vinculado — `null` si el sobre no tiene precio de compra conocido o si todavía
 * no hay ninguna carta vinculada. Se calcula siempre al vuelo a partir de los datos ya
 * cargados (nunca se guarda en `purchasePrice` de la carta): así queda correcto aunque se
 * añadan o quiten cartas del mismo sobre más adelante, en vez de quedarse desactualizado
 * como pasaría si se guardase un precio por carta fijo en el momento de añadirla. */
export function costPerCard(sealedPurchase: Pick<SealedPurchase, "purchasePrice">, linkedCount: number): number | null {
  if (sealedPurchase.purchasePrice === null || linkedCount <= 0) return null;
  return sealedPurchase.purchasePrice / linkedCount;
}

export function normalizeSetText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function setTextMatches(setName: string, hints: string[]): boolean {
  const itemText = normalizeSetText(setName);
  return hints.some((hint) => itemText.includes(hint) || hint.includes(itemText));
}

/** Quita ceros a la izquierda de un número de carta puramente numérico ("001" -> "1"),
 * para poder comparar cartas guardadas antes de cambiar de proveedor (pokemontcg.io, sin
 * relleno) con las de un checklist sincronizado después (TCGdex, con relleno a 3 dígitos)
 * — mismo número real, formato de texto distinto. Los números con letras (p. ej. "TG01")
 * se dejan tal cual, ahí sí importa el texto exacto. */
export function normalizeCardNumber(number: string): string {
  return /^\d+$/.test(number) ? String(Number(number)) : number;
}

export interface SetChecklistCompletion {
  owned: SetChecklistCard[];
  missing: SetChecklistCard[];
}

/** Clave número+variante normalizada, para no confundir "tienes la normal" con "tienes
 * la de reverso" de la misma carta — cada variante es un objeto físico distinto. */
function ownedKey(number: string, variant: CardVariant): string {
  return `${normalizeCardNumber(number)}::${variant}`;
}

/** Con qué nombres de set comparar una carta concreta del checklist: los suyos propios si
 * los tiene (siempre en un binder, que mezcla expansiones; también en un set oficial
 * sincronizado después de que existiera este campo), o si no los del checklist entero
 * como venía haciéndose antes de que las cartas guardasen su propia expansión — así un set
 * oficial sincronizado antes de este campo se sigue comparando igual que siempre. */
function cardSetHints(cardSetName: string | null, checklistHints: string[]): string[] {
  return cardSetName ? [normalizeSetText(cardSetName)] : checklistHints;
}

/** Un ejemplar marcado desde un checklist concreto (`item.checklistId` puesto) solo cuenta
 * como "tuya" DENTRO de ese mismo checklist — nunca en otro, aunque comparta la misma
 * carta real (mismo número+variante), como pasa cuando un binder reúne un Pokémon que
 * también está en un set oficial sincronizado aparte (bug real en producción, 2026-07:
 * Slowbro/Slowpoke de "Oscuridad Absoluta", presentes tanto en el set oficial como en el
 * binder "Slowpoke y Slowbro", se marcaban como propios en los dos con solo marcarla en
 * uno). Los ejemplares sin checklist de origen (altas manuales, o de antes de que
 * existiera este campo) siguen comparándose por el texto del nombre del set, como
 * siempre — fallback deliberado, no se puede saber a qué checklist "pertenecían". */
function belongsToChecklist(item: CollectionItem, checklistId: string, hints: string[]): boolean {
  if (item.checklistId !== null) return item.checklistId === checklistId;
  return !!item.setName && setTextMatches(item.setName, hints);
}

/** Compara el checklist de un set (sincronizado una vez desde el proveedor externo) con
 * la colección, para saber qué cartas ya tienes y cuáles te faltan. Para los ejemplares ya
 * vinculados a un checklist concreto (`checklistId`, ver `belongsToChecklist`) la
 * comparación es exacta; para los que no (altas manuales o de antes de que existiera el
 * campo) se compara por número de carta (universal, no depende del idioma) + variante
 * dentro de los ejemplares cuyo `setName` se parece a la expansión de origen de cada carta
 * del checklist (la suya propia si la tiene, si no las pistas a nivel de checklist entero
 * — ver `cardSetHints`); "se parece" es contención de texto en cualquiera de los dos
 * sentidos, no coincidencia exacta, porque ese fallback es un checklist de referencia, no
 * un vínculo estructural. */
export function computeSetChecklistCompletion(
  checklistCards: SetChecklistCard[],
  collectionItems: CollectionItem[],
  setNameHints: (string | null)[],
  checklistId: string,
): SetChecklistCompletion {
  const checklistHints = setNameHints.filter((hint): hint is string => !!hint).map(normalizeSetText);

  const owned: SetChecklistCard[] = [];
  const missing: SetChecklistCard[] = [];
  for (const card of checklistCards) {
    const hints = cardSetHints(card.setName, checklistHints);
    const key = ownedKey(card.number, card.variant);
    const isOwned = collectionItems.some((item) => {
      if (!belongsToChecklist(item, checklistId, hints)) return false;
      const number = item.number?.split("/")[0].trim();
      return !!number && ownedKey(number, item.variant) === key;
    });
    (isOwned ? owned : missing).push(card);
  }
  return { owned, missing };
}

/** Ids de todos los ejemplares de la colección que corresponden a alguna de estas cartas
 * del checklist (mismo criterio de coincidencia que `computeSetChecklistCompletion`,
 * incluida la pertenencia por `checklistId` — ver `belongsToChecklist`). Puede haber más
 * de un id por carta si hay filas duplicadas — se devuelven todas, para poder "desmarcar"
 * (borrar de la colección real) una carta de golpe desde el checklist, no solo la primera
 * fila que coincida. */
export function findOwnedCollectionItemIds(
  cards: { number: string; variant: CardVariant; setName?: string | null }[],
  collectionItems: CollectionItem[],
  setNameHints: (string | null)[],
  checklistId: string,
): string[] {
  const checklistHints = setNameHints.filter((hint): hint is string => !!hint).map(normalizeSetText);
  const ids: string[] = [];
  for (const card of cards) {
    const hints = cardSetHints(card.setName ?? null, checklistHints);
    const key = ownedKey(card.number, card.variant);
    for (const item of collectionItems) {
      if (!belongsToChecklist(item, checklistId, hints)) continue;
      const number = item.number?.split("/")[0].trim();
      if (number && ownedKey(number, item.variant) === key) ids.push(item.id);
    }
  }
  return ids;
}

/** Busca, entre los checklists ya sincronizados, la carta que coincide por expansión
 * (parecido, no exacto — mismo criterio que `computeSetChecklistCompletion`, usando la
 * expansión propia de cada carta si la tiene) y número, para poder usar la imagen oficial
 * del proveedor al dar de alta una carta en vez de guardar la foto que hizo el usuario.
 * `null` si no hay ninguna coincidencia, o si el número no está relleno (no hay con qué
 * cruzar). */
export function findChecklistCardImage(
  setName: string | null,
  number: string | null,
  checklists: SetChecklist[],
  cardsByChecklist: Record<string, SetChecklistCard[]>,
): SetChecklistCard | null {
  if (!setName || !number) return null;
  const numberPrefix = normalizeCardNumber(number.split("/")[0].trim());
  if (!numberPrefix) return null;

  for (const checklist of checklists) {
    const checklistHints = [checklist.setName, checklist.setNameEs].filter((hint): hint is string => !!hint).map(normalizeSetText);
    for (const card of cardsByChecklist[checklist.id] ?? []) {
      if (normalizeCardNumber(card.number) !== numberPrefix) continue;
      if (setTextMatches(setName, cardSetHints(card.setName, checklistHints))) return card;
    }
  }
  return null;
}

/** Ejemplares ya existentes en TODA la colección (a diferencia de `computeSetChecklistCompletion`,
 * que solo mira dentro de un checklist concreto) que coinciden con esta carta exacta —
 * mismo número+variante, expansión parecida (mismo criterio de `setTextMatches`). Para
 * avisar "ya tienes N" al aplicar una coincidencia del catálogo al dar de alta una carta
 * suelta, sin bloquear el alta (puede ser una segunda copia real, o un regalo). */
export function findMatchingCollectionItems(
  card: { setName: string; number: string; variant: CardVariant },
  items: CollectionItem[],
): CollectionItem[] {
  const key = ownedKey(card.number.split("/")[0].trim(), card.variant);
  const hints = [normalizeSetText(card.setName)];
  return items.filter((item) => {
    const number = item.number?.split("/")[0].trim();
    if (!number || ownedKey(number, item.variant) !== key) return false;
    return !!item.setName && setTextMatches(item.setName, hints);
  });
}

/** Checklists (sets oficiales o binders) ya sincronizados cuyo listado de cartas incluye
 * esta carta exacta (mismo número+variante) — para poder ofrecer asignar un alta manual a
 * su checklist de origen cuando corresponda, en vez de dejarla siempre como carta suelta
 * sin checklist. Solo se ofrecen los que de verdad la contienen: asignarla a uno que no la
 * tuviera distorsionaría el % completado de ese checklist. */
export function findChecklistsContainingCard(
  card: { setName: string; number: string; variant: CardVariant },
  checklists: SetChecklist[],
  cardsByChecklist: Record<string, SetChecklistCard[]>,
): SetChecklist[] {
  const key = ownedKey(card.number.split("/")[0].trim(), card.variant);
  return checklists.filter((checklist) => {
    const checklistHints = [checklist.setName, checklist.setNameEs].filter((hint): hint is string => !!hint).map(normalizeSetText);
    return (cardsByChecklist[checklist.id] ?? []).some((c) => {
      const hints = cardSetHints(c.setName, checklistHints);
      return ownedKey(c.number, c.variant) === key && setTextMatches(card.setName, hints);
    });
  });
}

// ---- Estadísticas de colección (Fase 2 del roadmap) ----

/** La carta de mayor valor estimado por unidad (no por fila×cantidad: interesa "cuál es
 * la carta", no "qué fila suma más"). Ignora ejemplares sin valor estimado conocido —
 * `null` nunca compite por ser "la más valiosa" frente a un valor real, por pequeño que
 * sea. `null` si la colección está vacía o ninguna tiene valor conocido. */
export function mostValuableItem(items: CollectionItem[]): CollectionItem | null {
  let best: CollectionItem | null = null;
  for (const item of items) {
    if (item.estimatedValueOverride === null) continue;
    if (best === null || item.estimatedValueOverride > (best.estimatedValueOverride as number)) best = item;
  }
  return best;
}

export interface CollectionDistributionEntry {
  /** Valor bruto (rareza o código de idioma) tal cual está guardado — la pantalla decide
   * cómo mostrarlo (p. ej. mapear el código de idioma a una etiqueta corta). */
  key: string;
  /** Suma de `quantity`, no nº de filas — dos filas de x1 y x3 de la misma rareza cuentan
   * 4, no 2 (mismo criterio que el resto de agregados de la app, ver `countLinkedCollectionItems`). */
  count: number;
}

function distributionBy(items: CollectionItem[], keyOf: (item: CollectionItem) => string): CollectionDistributionEntry[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + item.quantity);
  }
  return [...counts.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
}

/** De más a menos frecuente. Sin rareza conocida se agrupa bajo "Sin rareza" (nunca se
 * inventa una rareza real donde no la hay). */
export function collectionRarityDistribution(items: CollectionItem[]): CollectionDistributionEntry[] {
  return distributionBy(items, (item) => item.rarity ?? "Sin rareza");
}

/** De más a menos frecuente, por código de idioma ("es", "en"...) — la pantalla decide la
 * etiqueta corta a mostrar (mismo mapa que ya usa cada `ItemCard`). */
export function collectionLanguageDistribution(items: CollectionItem[]): CollectionDistributionEntry[] {
  return distributionBy(items, (item) => item.language);
}

// ---- Orden de "Mi colección" > Cartas ----

export type CollectionSortKey = "name" | "value_desc" | "purchase_date_desc";

export const COLLECTION_SORT_LABELS: Record<CollectionSortKey, string> = {
  name: "Nombre (A-Z)",
  value_desc: "Valor estimado (mayor a menor)",
  purchase_date_desc: "Comprada más reciente",
};

/** Nueva copia ordenada (no muta `items`): las fechas de compra son texto "YYYY-MM-DD"
 * (ver Bug real: columnas `date` de Postgres, ARCHITECTURE.md), así que el orden
 * lexicográfico ya es el orden cronológico correcto, sin parsear a `Date`. Sin fecha de
 * compra conocida, se queda al final (nunca antes que una fecha real). */
export function sortCollectionItems(items: CollectionItem[], sortBy: CollectionSortKey): CollectionItem[] {
  const sorted = [...items];
  switch (sortBy) {
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name, "es"));
      break;
    case "value_desc":
      sorted.sort((a, b) => (b.estimatedValueOverride ?? -1) - (a.estimatedValueOverride ?? -1));
      break;
    case "purchase_date_desc":
      sorted.sort((a, b) => (b.purchaseDate ?? "").localeCompare(a.purchaseDate ?? ""));
      break;
  }
  return sorted;
}

// ---- Resumen agregado de sets/binders sincronizados ----

export interface ChecklistCompletionSummary {
  checklistId: string;
  title: string;
  ownedCount: number;
  /** Filas del checklist, no `checklist.totalCards` (que cuenta cartas del set, no filas
   * de variante) — mismo criterio que ya usa `SetCard` para el "X/Y" de cada set. */
  totalCount: number;
  pct: number;
  /** Suma de `referencePrice` de las cartas que faltan (solo las que tienen precio
   * conocido) — cuánto costaría, a precio de referencia, terminar este set/binder. */
  missingCost: number;
  /** Cuántas de las que faltan no tienen precio de referencia conocido — para no dar la
   * falsa impresión de que `missingCost` es el coste completo si faltan precios por medio. */
  missingWithoutPrice: number;
}

/** Un resumen por checklist (set oficial o binder) de cuánto llevas y cuánto costaría
 * terminarlo, para poder decidir en cuál merece más la pena centrarte. Reutiliza
 * `computeSetChecklistCompletion` (ya aislado por checklist, ver `belongsToChecklist`), así
 * que hereda la misma corrección de "no compartir cartas entre checklists". */
export function summarizeChecklistCompletion(
  checklists: SetChecklist[],
  cardsByChecklist: Record<string, SetChecklistCard[]>,
  collectionItems: CollectionItem[],
): ChecklistCompletionSummary[] {
  return checklists.map((checklist) => {
    const cards = cardsByChecklist[checklist.id] ?? [];
    const { owned, missing } = computeSetChecklistCompletion(
      cards,
      collectionItems,
      [checklist.setName, checklist.setNameEs],
      checklist.id,
    );
    let missingCost = 0;
    let missingWithoutPrice = 0;
    for (const card of missing) {
      if (card.referencePrice !== null) missingCost += card.referencePrice;
      else missingWithoutPrice++;
    }
    const totalCount = cards.length;
    return {
      checklistId: checklist.id,
      title: checklist.setNameEs ?? checklist.setName,
      ownedCount: owned.length,
      totalCount,
      pct: totalCount > 0 ? Math.round((owned.length / totalCount) * 100) : 0,
      missingCost,
      missingWithoutPrice,
    };
  });
}
