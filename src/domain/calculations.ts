import type { PlanCategory, PlanItem, WishlistItem } from "./types";

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

export const PLAN_CATEGORIES: PlanCategory[] = ["comprar", "abrir", "guardar_sellado"];
export const PLAN_CATEGORY_LABELS: Record<PlanCategory, string> = {
  comprar: "Comprar",
  abrir: "Abrir",
  guardar_sellado: "Guardar sellado",
};

export interface PlanMonthGroup {
  month: string;
  byCategory: Record<PlanCategory, PlanItem[]>;
}

/** Agrupa el plan de compra mensual por mes (orden cronológico) y, dentro de cada mes,
 * por categoría en el orden fijo comprar/abrir/guardar_sellado del propio plan. */
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

/** El "ref. ~59 €" (o "ref. ~20-30 €, suele ser de las más caras…") que suele venir
 * embebido como texto libre al final de la descripción de un ítem del plan. Un solo
 * paréntesis "(ref. …)" — no cruza a otros paréntesis del resto de la frase (p. ej. "(ES)"). */
const REF_PRICE_REGEX = /\(ref\.[^)]*\)/i;

/** Divide la descripción de un ítem del plan en el texto libre de alrededor y el
 * paréntesis de precio de referencia, si lo tiene — para poder destacarlo tipográficamente
 * sin tocar el texto original ni el modelo de datos (sigue siendo un único string libre).
 * `before + refPrice + after` reconstruye exactamente `description`. */
export function splitReferencePrice(description: string): { before: string; refPrice: string | null; after: string } {
  const match = description.match(REF_PRICE_REGEX);
  if (!match || match.index === undefined) return { before: description, refPrice: null, after: "" };
  return {
    before: description.slice(0, match.index),
    refPrice: match[0],
    after: description.slice(match.index + match[0].length),
  };
}

/** Extrae un importe aproximado del precio de referencia embebido en una descripción,
 * para poder estimar el gasto del mes — si es un rango ("~20-30 €") usa la media. `null`
 * si no hay ningún paréntesis "(ref. …)" o no se reconoce ningún número dentro (es texto
 * libre, no un campo estructurado; no siempre se podrá parsear y no pasa nada).
 * Solo mira los 2 primeros números del paréntesis (un valor único, o "min-max"): es texto
 * libre editable a mano, y un número suelto añadido después del precio (p. ej. un año,
 * "desde 2024") no debe colarse en la media y disparar la estimación. */
export function parseReferenceAmount(description: string): number | null {
  const match = description.match(REF_PRICE_REGEX);
  if (!match) return null;
  const numbers = match[0].match(/\d+(?:[.,]\d+)?/g);
  if (!numbers || numbers.length === 0) return null;
  const values = numbers
    .slice(0, 2)
    .map((n) => Number(n.replace(",", ".")))
    .filter((n) => !Number.isNaN(n));
  if (values.length === 0) return null;
  return values.reduce((sum, n) => sum + n, 0) / values.length;
}

export interface PlanMonthEstimate {
  /** Suma de los precios de referencia reconocidos en "comprar" + "abrir" (no
   * "guardar_sellado": eso ya es tuyo, no es un gasto nuevo del mes). Aproximado. */
  amount: number;
  /** Cuántos ítems de "comprar"/"abrir" tenían un precio de referencia reconocible. */
  pricedCount: number;
  doneCount: number;
  totalCount: number;
}

/** Progreso ("X/Y hechos") y coste aproximado ("~123 €") de un mes del plan, para poder
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
      const parsed = parseReferenceAmount(item.description);
      if (parsed !== null) {
        amount += parsed;
        pricedCount++;
      }
    }
  }
  return { amount, pricedCount, doneCount, totalCount };
}
