import type { WishlistItemWithCard } from "./types";

export function formatMoney(amount: number | null, currency = "EUR"): string {
  if (amount === null) return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount);
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
