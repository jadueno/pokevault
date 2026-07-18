import { describe, expect, it } from "vitest";
import type { CollectionItem, PlanItem, SealedPurchase, SetChecklistCard, WishlistItem } from "./types";
import {
  computeSetChecklistCompletion,
  costPerCard,
  countLinkedCollectionItems,
  estimatePlanMonth,
  formatMoney,
  groupPlanByMonth,
  groupWishlistByMonth,
  parseReferenceAmount,
  parseSearchTerm,
  splitReferencePrice,
} from "./calculations";

function planItem(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: "p1",
    month: "2026-08",
    category: "comprar",
    description: "1x Elite Trainer Box 30th Celebration (ES) (ref. ~59 €) — lanzamiento mundial simultáneo 16 sept.",
    done: false,
    position: 0,
    ...overrides,
  };
}

function wishlistItem(overrides: Partial<WishlistItem> = {}): WishlistItem {
  return {
    id: "w1",
    name: "Charizard",
    setName: "Base",
    priority: "medium",
    maxPrice: null,
    targetMonth: null,
    notes: null,
    photo: null,
    ...overrides,
  };
}

function collectionItem(overrides: Partial<CollectionItem> = {}): CollectionItem {
  return {
    id: "c1",
    name: "Eevee",
    setName: "Jungla",
    number: null,
    rarity: null,
    language: "es",
    condition: "near_mint",
    quantity: 1,
    acquisitionType: "pulled_from_pack",
    sealedPurchaseId: "sp1",
    purchasePrice: null,
    purchaseCurrency: "EUR",
    purchaseDate: null,
    isGraded: false,
    gradingCompany: null,
    grade: null,
    estimatedValueOverride: null,
    estimatedValueOverrideAt: null,
    estimatedValueOverrideNote: null,
    notes: null,
    photo: null,
    ...overrides,
  };
}

function sealedPurchase(overrides: Partial<SealedPurchase> = {}): SealedPurchase {
  return {
    id: "sp1",
    productName: "ETB Oscuridad Absoluta",
    productType: "elite_trainer_box",
    quantity: 1,
    purchasePrice: 60,
    purchaseCurrency: "EUR",
    purchaseDate: null,
    estimatedValueOverride: null,
    estimatedValueOverrideAt: null,
    estimatedValueOverrideNote: null,
    location: null,
    notes: null,
    photo: null,
    ...overrides,
  };
}

function checklistCard(overrides: Partial<SetChecklistCard> = {}): SetChecklistCard {
  return {
    id: "cc1",
    checklistId: "checklist1",
    number: "1",
    name: "Tropius",
    rarity: "Common",
    imageUrl: null,
    imageUrlLarge: null,
    ...overrides,
  };
}

describe("computeSetChecklistCompletion", () => {
  it("separa cartas del checklist en 'owned' y 'missing' según el número dentro de la colección", () => {
    const cards = [
      checklistCard({ number: "1", name: "Tropius" }),
      checklistCard({ number: "2", name: "Grubbin" }),
      checklistCard({ number: "3", name: "Charmander" }),
    ];
    const items = [
      collectionItem({ setName: "Oscuridad Absoluta", number: "1/120" }),
      collectionItem({ setName: "Oscuridad Absoluta", number: "2/120" }),
    ];
    const { owned, missing } = computeSetChecklistCompletion(cards, items, ["Pitch Black", "Oscuridad Absoluta"]);

    expect(owned.map((c) => c.number)).toEqual(["1", "2"]);
    expect(missing.map((c) => c.number)).toEqual(["3"]);
  });

  it("relaciona por número aunque el nombre del set esté en inglés en la colección", () => {
    const cards = [checklistCard({ number: "1" })];
    const items = [collectionItem({ setName: "Pitch Black", number: "1/120" })];
    const { owned } = computeSetChecklistCompletion(cards, items, ["Pitch Black", "Oscuridad Absoluta"]);
    expect(owned).toHaveLength(1);
  });

  it("ignora cartas de otro set aunque compartan número", () => {
    const cards = [checklistCard({ number: "1" })];
    const items = [collectionItem({ setName: "Base Set", number: "1/102" })];
    const { owned, missing } = computeSetChecklistCompletion(cards, items, ["Pitch Black", "Oscuridad Absoluta"]);
    expect(owned).toHaveLength(0);
    expect(missing).toHaveLength(1);
  });

  it("no distingue mayúsculas ni acentos al comparar el nombre del set", () => {
    const cards = [checklistCard({ number: "1" })];
    const items = [collectionItem({ setName: "OSCURIDAD ABSOLUTA", number: "1/120" })];
    const { owned } = computeSetChecklistCompletion(cards, items, ["Oscuridad Absoluta"]);
    expect(owned).toHaveLength(1);
  });

  it("sin colección, todas las cartas del checklist están 'missing'", () => {
    const cards = [checklistCard({ number: "1" }), checklistCard({ number: "2" })];
    const { owned, missing } = computeSetChecklistCompletion(cards, [], ["Oscuridad Absoluta"]);
    expect(owned).toHaveLength(0);
    expect(missing).toHaveLength(2);
  });
});

describe("countLinkedCollectionItems", () => {
  it("suma la cantidad (no el nº de filas) de las cartas vinculadas a un sobre", () => {
    const items = [
      collectionItem({ id: "c1", sealedPurchaseId: "sp1", quantity: 1 }),
      collectionItem({ id: "c2", sealedPurchaseId: "sp1", quantity: 3 }),
      collectionItem({ id: "c3", sealedPurchaseId: "sp2", quantity: 5 }), // otro sobre, no cuenta
      collectionItem({ id: "c4", sealedPurchaseId: null, quantity: 2 }), // sin sobre, no cuenta
    ];
    expect(countLinkedCollectionItems("sp1", items)).toBe(4);
  });

  it("sin cartas vinculadas, devuelve 0", () => {
    expect(countLinkedCollectionItems("sp1", [])).toBe(0);
  });
});

describe("costPerCard", () => {
  it("reparte el precio de compra del sobre entre las cartas vinculadas", () => {
    expect(costPerCard(sealedPurchase({ purchasePrice: 60 }), 4)).toBe(15);
  });

  it("sin precio de compra del sobre, devuelve null", () => {
    expect(costPerCard(sealedPurchase({ purchasePrice: null }), 4)).toBeNull();
  });

  it("sin cartas vinculadas todavía, devuelve null (no dividir por 0)", () => {
    expect(costPerCard(sealedPurchase({ purchasePrice: 60 }), 0)).toBeNull();
  });
});

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
    const items = [wishlistItem({ id: "w1", targetMonth: null }), wishlistItem({ id: "w2", targetMonth: "2026-08" })];
    const groups = groupWishlistByMonth(items);
    expect(groups.map((g) => g.month)).toEqual(["2026-08", null]);
  });
});

describe("splitReferencePrice", () => {
  it("separa el paréntesis de precio de referencia del resto de la frase", () => {
    const result = splitReferencePrice(
      "1x Elite Trainer Box 30th Celebration (ES) (ref. ~59 €) — lanzamiento mundial simultáneo 16 sept.",
    );
    expect(result).toEqual({
      before: "1x Elite Trainer Box 30th Celebration (ES) ",
      refPrice: "(ref. ~59 €)",
      after: " — lanzamiento mundial simultáneo 16 sept.",
    });
  });

  it("no confunde otros paréntesis de la frase (p. ej. el idioma) con el de precio", () => {
    const result = splitReferencePrice("Dragonite Illustration Rare (ref. ~20-30 €, suele ser de las más caras de esta tirada)");
    expect(result.before).toBe("Dragonite Illustration Rare ");
    expect(result.refPrice).toBe("(ref. ~20-30 €, suele ser de las más caras de esta tirada)");
    expect(result.after).toBe("");
  });

  it("sin precio de referencia, deja todo el texto en 'before'", () => {
    const result = splitReferencePrice("1x ETB Megaevolución - Oscuridad Absoluta (ES)");
    expect(result).toEqual({ before: "1x ETB Megaevolución - Oscuridad Absoluta (ES)", refPrice: null, after: "" });
  });
});

describe("parseReferenceAmount", () => {
  it("parsea un precio único", () => {
    expect(parseReferenceAmount("1x ETB (ref. ~59 €)")).toBe(59);
  });

  it("usa la media de un rango de precio", () => {
    expect(parseReferenceAmount("Dragonite IR (ref. ~20-30 €, suele ser cara)")).toBe(25);
  });

  it("sin paréntesis de referencia, devuelve null", () => {
    expect(parseReferenceAmount("1x ETB sin precio")).toBeNull();
  });

  it("ignora números sueltos tras el rango de precio (p. ej. un año) en vez de meterlos en la media", () => {
    // Bug real: "(ref. ~45-60 €, set ya asentado desde 2024)" promediaba 45+60+2024 y
    // disparaba la estimación del mes a más de 700 €.
    expect(parseReferenceAmount("1x ETB (ref. ~45-60 €, set ya asentado desde 2024)")).toBe(52.5);
  });
});

describe("parseSearchTerm", () => {
  it("extrae el término de búsqueda literal entre comillas", () => {
    expect(
      parseSearchTerm('1x Booster Bundle Oscuridad Absoluta (ES) (ref. ~35 €) — buscar: "Caja 6 Sobres Oscuridad Absoluta Español"'),
    ).toBe("Caja 6 Sobres Oscuridad Absoluta Español");
  });

  it("sin marca de búsqueda, devuelve null", () => {
    expect(parseSearchTerm("2x Illustration Rare (ref. ~8-15 € cada una)")).toBeNull();
  });
});

describe("estimatePlanMonth", () => {
  it("suma solo comprar/abrir (no guardar_sellado) y cuenta el progreso de todas las categorías", () => {
    const items = [
      planItem({ id: "p1", category: "comprar", description: "1x ETB (ref. ~59 €)", done: true }),
      planItem({ id: "p2", category: "abrir", description: "1x Booster Bundle (ref. ~20-30 €)", done: false }),
      planItem({ id: "p3", category: "guardar_sellado", description: "1x Booster Box (ref. ~120 €)", done: false }),
      planItem({ id: "p4", category: "comprar", description: "Algo sin precio de referencia", done: false }),
    ];
    const [group] = groupPlanByMonth(items);
    const estimate = estimatePlanMonth(group);

    expect(estimate.amount).toBe(84); // 59 + 25, no cuenta guardar_sellado ni el ítem sin precio
    expect(estimate.pricedCount).toBe(2);
    expect(estimate.doneCount).toBe(1);
    expect(estimate.totalCount).toBe(4);
  });

  it("mes sin ningún precio de referencia: amount 0 y pricedCount 0", () => {
    const items = [planItem({ description: "Algo sin precio" })];
    const [group] = groupPlanByMonth(items);
    const estimate = estimatePlanMonth(group);
    expect(estimate).toEqual({ amount: 0, pricedCount: 0, doneCount: 0, totalCount: 1 });
  });
});
