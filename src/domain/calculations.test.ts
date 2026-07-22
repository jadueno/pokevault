import { describe, expect, it } from "vitest";
import type { CollectionItem, PlanItem, SealedPurchase, SetChecklist, SetChecklistCard, WishlistItem } from "./types";
import {
  computeSetChecklistCompletion,
  costPerCard,
  countLinkedCollectionItems,
  estimatePlanMonth,
  findChecklistCardImage,
  formatMoney,
  groupPlanByMonth,
  groupWishlistByMonth,
  totalPlanInvested,
} from "./calculations";

function planItem(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: "p1",
    month: "2026-08",
    category: "comprar",
    description: "1x Elite Trainer Box 30th Celebration (ES) — lanzamiento mundial simultáneo 16 sept.",
    referencePrice: 59,
    searchTerm: null,
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
    referencePrice: null,
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

  it("relaciona el número aunque el checklist lo tenga con ceros a la izquierda (TCGdex) y la carta guardada no (pokemontcg.io)", () => {
    const cards = [checklistCard({ number: "001" })];
    const items = [collectionItem({ setName: "Oscuridad Absoluta", number: "1/120" })];
    const { owned } = computeSetChecklistCompletion(cards, items, ["Oscuridad Absoluta"]);
    expect(owned).toHaveLength(1);
  });
});

function setChecklist(overrides: Partial<SetChecklist> = {}): SetChecklist {
  return {
    id: "cl1",
    externalSetId: "me5",
    setName: "Pitch Black",
    setNameEs: "Oscuridad Absoluta",
    totalCards: 2,
    syncedAt: "2026-07-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("findChecklistCardImage", () => {
  it("encuentra la carta por set (parecido) + número y devuelve su ficha", () => {
    const card = checklistCard({ number: "48", name: "Mega Darkrai ex" });
    const result = findChecklistCardImage("Oscuridad Absoluta", "48/120", [setChecklist()], { cl1: [card] });
    expect(result).toEqual(card);
  });

  it("sin nombre de set o sin número, devuelve null (no hay con qué cruzar)", () => {
    const card = checklistCard({ number: "48" });
    expect(findChecklistCardImage(null, "48/120", [setChecklist()], { cl1: [card] })).toBeNull();
    expect(findChecklistCardImage("Oscuridad Absoluta", null, [setChecklist()], { cl1: [card] })).toBeNull();
  });

  it("si ningún checklist sincronizado coincide con el set, devuelve null", () => {
    const card = checklistCard({ number: "48" });
    const result = findChecklistCardImage("Base Set", "48/102", [setChecklist()], { cl1: [card] });
    expect(result).toBeNull();
  });

  it("si el set coincide pero no hay ninguna carta con ese número, devuelve null", () => {
    const card = checklistCard({ number: "48" });
    const result = findChecklistCardImage("Oscuridad Absoluta", "99/120", [setChecklist()], { cl1: [card] });
    expect(result).toBeNull();
  });

  it("encuentra la carta aunque el checklist tenga el número con ceros a la izquierda", () => {
    const card = checklistCard({ number: "048", name: "Mega Darkrai ex" });
    const result = findChecklistCardImage("Oscuridad Absoluta", "48/120", [setChecklist()], { cl1: [card] });
    expect(result).toEqual(card);
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

describe("estimatePlanMonth", () => {
  it("suma solo 'comprar' (no guardar_sellado) y cuenta el progreso de todas las categorías", () => {
    const items = [
      planItem({ id: "p1", category: "comprar", description: "1x ETB", referencePrice: 59, done: true }),
      planItem({ id: "p2", category: "comprar", description: "1x Booster Bundle", referencePrice: 25, done: false }),
      planItem({ id: "p3", category: "guardar_sellado", description: "1x Booster Box", referencePrice: 120, done: false }),
      planItem({ id: "p4", category: "comprar", description: "Algo sin precio de referencia", referencePrice: null, done: false }),
    ];
    const [group] = groupPlanByMonth(items);
    const estimate = estimatePlanMonth(group);

    expect(estimate.amount).toBe(84); // 59 + 25, no cuenta guardar_sellado ni el ítem sin precio
    expect(estimate.pricedCount).toBe(2);
    expect(estimate.doneCount).toBe(1);
    expect(estimate.totalCount).toBe(4);
  });

  it("mes sin ningún precio de referencia: amount 0 y pricedCount 0", () => {
    const items = [planItem({ description: "Algo sin precio", referencePrice: null })];
    const [group] = groupPlanByMonth(items);
    const estimate = estimatePlanMonth(group);
    expect(estimate).toEqual({ amount: 0, pricedCount: 0, doneCount: 0, totalCount: 1 });
  });
});

describe("totalPlanInvested", () => {
  it("suma el precio de referencia de los ítems 'comprar' ya hechos, de todos los meses", () => {
    const items = [
      planItem({ id: "p1", month: "2026-08", category: "comprar", referencePrice: 59, done: true }),
      planItem({ id: "p2", month: "2026-09", category: "comprar", referencePrice: 25, done: true }),
      planItem({ id: "p3", month: "2026-08", category: "comprar", referencePrice: 30, done: false }), // no hecho
      planItem({ id: "p4", month: "2026-08", category: "guardar_sellado", referencePrice: 120, done: true }), // ya era tuyo
      planItem({ id: "p5", month: "2026-08", category: "comprar", referencePrice: null, done: true }), // sin precio
    ];
    expect(totalPlanInvested(items)).toBe(84); // 59 + 25
  });

  it("sin ítems 'comprar' hechos con precio, devuelve 0", () => {
    expect(totalPlanInvested([])).toBe(0);
  });
});
