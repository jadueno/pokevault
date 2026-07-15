import { describe, expect, it } from "vitest";
import type { WishlistItemWithCard } from "./types";
import { formatMoney, groupWishlistByMonth } from "./calculations";

function card(overrides: Partial<WishlistItemWithCard["card"]> = {}) {
  return {
    id: "c1",
    provider: "fake",
    externalId: "base1-4",
    setId: "s1",
    name: "Charizard",
    number: "4",
    rarity: "Rare Holo",
    artist: null,
    supertype: "Pokémon",
    subtypes: [],
    types: ["Fire"],
    imageSmallUrl: null,
    imageLargeUrl: null,
    currentPrice: 120,
    currentPriceCurrency: "EUR",
    priceUpdatedAt: null,
    priceSource: null,
    ...overrides,
  };
}

function wishlistItem(overrides: Partial<WishlistItemWithCard> = {}): WishlistItemWithCard {
  return {
    id: "w1",
    catalogCardId: "c1",
    priority: "medium",
    maxPrice: null,
    targetMonth: null,
    notes: null,
    card: card(),
    ...overrides,
  };
}

describe("formatMoney", () => {
  it("formatea un importe en euros", () => {
    expect(formatMoney(120)).toContain("120");
  });

  it("devuelve un guion para null en vez de 0€ (no mentir sobre un valor desconocido)", () => {
    expect(formatMoney(null)).toBe("—");
  });
});

describe("groupWishlistByMonth", () => {
  it("agrupa por mes objetivo, ordenado cronológicamente", () => {
    const items = [
      wishlistItem({ id: "w1", targetMonth: "2026-09" }),
      wishlistItem({ id: "w2", targetMonth: "2026-08" }),
      wishlistItem({ id: "w3", targetMonth: "2026-08" }),
    ];
    const groups = groupWishlistByMonth(items);
    expect(groups.map((g) => g.month)).toEqual(["2026-08", "2026-09"]);
    expect(groups[0].items).toHaveLength(2);
  });

  it("deja los elementos sin mes objetivo al final, en su propio grupo", () => {
    const items = [
      wishlistItem({ id: "w1", targetMonth: null }),
      wishlistItem({ id: "w2", targetMonth: "2026-08" }),
    ];
    const groups = groupWishlistByMonth(items);
    expect(groups.map((g) => g.month)).toEqual(["2026-08", null]);
  });
});
