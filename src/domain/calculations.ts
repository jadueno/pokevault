import type { CollectionItem, PlanCategory, PlanItem, SealedPurchase, SetChecklist, SetChecklistCard, WishlistItem } from "./types";

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

/** Compara el checklist de un set (sincronizado una vez desde el proveedor externo) con
 * la colección, para saber qué cartas ya tienes y cuáles te faltan. `collection_items` es
 * freeform (el nombre del set puede estar en cualquier idioma o forma, según lo que haya
 * reconocido la IA o escrito el usuario a mano), así que no hay relación por id — se
 * compara por número de carta (universal, no depende del idioma) dentro de los ejemplares
 * cuyo `setName` se parece al nombre del set en inglés o en español (`setNameHints`);
 * "se parece" es contención de texto en cualquiera de los dos sentidos, no coincidencia
 * exacta, porque es un checklist de referencia, no un vínculo estructural. */
export function computeSetChecklistCompletion(
  checklistCards: SetChecklistCard[],
  collectionItems: CollectionItem[],
  setNameHints: (string | null)[],
): SetChecklistCompletion {
  const hints = setNameHints.filter((hint): hint is string => !!hint).map(normalizeSetText);
  const ownedNumbers = new Set(
    collectionItems
      .filter((item) => item.setName && setTextMatches(item.setName, hints))
      .map((item) => item.number?.split("/")[0].trim())
      .filter((number): number is string => !!number)
      .map(normalizeCardNumber),
  );

  const owned: SetChecklistCard[] = [];
  const missing: SetChecklistCard[] = [];
  for (const card of checklistCards) {
    (ownedNumbers.has(normalizeCardNumber(card.number)) ? owned : missing).push(card);
  }
  return { owned, missing };
}

/** Busca, entre los checklists ya sincronizados, la carta que coincide por nombre de
 * expansión (parecido, no exacto — mismo criterio que `computeSetChecklistCompletion`) y
 * número, para poder usar la imagen oficial del proveedor al dar de alta una carta en vez
 * de guardar la foto que hizo el usuario. `null` si no hay ningún checklist sincronizado
 * para ese set, o si el número no está relleno (no hay con qué cruzar). */
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
    const hints = [checklist.setName, checklist.setNameEs].filter((hint): hint is string => !!hint).map(normalizeSetText);
    if (!setTextMatches(setName, hints)) continue;
    const match = (cardsByChecklist[checklist.id] ?? []).find((card) => normalizeCardNumber(card.number) === numberPrefix);
    if (match) return match;
  }
  return null;
}
