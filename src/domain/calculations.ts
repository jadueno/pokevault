import type { PlanCategory, PlanItem, WishlistItemWithCard } from "./types";

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
  items: WishlistItemWithCard[];
}

/** Agrupa la wishlist por mes objetivo: es la pantalla de planificación de compra
 * mensual ("en agosto esto, en septiembre esto otro") pedida por el usuario, sin
 * necesitar una tabla nueva — target_month ya vive en cada elemento de la wishlist. */
export function groupWishlistByMonth(items: WishlistItemWithCard[]): WishlistMonthGroup[] {
  const groups = new Map<string | null, WishlistItemWithCard[]>();
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
