import { describe, expect, it } from "vitest";
import type { CollectionItem, PlanItem, SealedPurchase, SetChecklist, SetChecklistCard, WishlistItem } from "./types";
import {
  collectionLanguageDistribution,
  collectionRarityDistribution,
  computeSetChecklistCompletion,
  costPerCard,
  countLinkedCollectionItems,
  estimatePlanMonth,
  findChecklistCardImage,
  findChecklistsContainingCard,
  findMatchingCollectionItems,
  findOwnedCollectionItemIds,
  formatMoney,
  groupPlanByMonth,
  groupWishlistByMonth,
  mostValuableItem,
  sortCollectionItems,
  summarizeChecklistCompletion,
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
    countedElsewhere: false,
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
    variant: "normal",
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
    checklistId: null,
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
    variant: "normal",
    imageUrl: null,
    imageUrlLarge: null,
    referencePrice: null,
    setName: null,
    setTotalCards: null,
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
    const { owned, missing } = computeSetChecklistCompletion(cards, items, ["Pitch Black", "Oscuridad Absoluta"], "cl1");

    expect(owned.map((c) => c.number)).toEqual(["1", "2"]);
    expect(missing.map((c) => c.number)).toEqual(["3"]);
  });

  it("relaciona por número aunque el nombre del set esté en inglés en la colección", () => {
    const cards = [checklistCard({ number: "1" })];
    const items = [collectionItem({ setName: "Pitch Black", number: "1/120" })];
    const { owned } = computeSetChecklistCompletion(cards, items, ["Pitch Black", "Oscuridad Absoluta"], "cl1");
    expect(owned).toHaveLength(1);
  });

  it("ignora cartas de otro set aunque compartan número", () => {
    const cards = [checklistCard({ number: "1" })];
    const items = [collectionItem({ setName: "Base Set", number: "1/102" })];
    const { owned, missing } = computeSetChecklistCompletion(cards, items, ["Pitch Black", "Oscuridad Absoluta"], "cl1");
    expect(owned).toHaveLength(0);
    expect(missing).toHaveLength(1);
  });

  it("no distingue mayúsculas ni acentos al comparar el nombre del set", () => {
    const cards = [checklistCard({ number: "1" })];
    const items = [collectionItem({ setName: "OSCURIDAD ABSOLUTA", number: "1/120" })];
    const { owned } = computeSetChecklistCompletion(cards, items, ["Oscuridad Absoluta"], "cl1");
    expect(owned).toHaveLength(1);
  });

  it("sin colección, todas las cartas del checklist están 'missing'", () => {
    const cards = [checklistCard({ number: "1" }), checklistCard({ number: "2" })];
    const { owned, missing } = computeSetChecklistCompletion(cards, [], ["Oscuridad Absoluta"], "cl1");
    expect(owned).toHaveLength(0);
    expect(missing).toHaveLength(2);
  });

  it("relaciona el número aunque el checklist lo tenga con ceros a la izquierda (TCGdex) y la carta guardada no (pokemontcg.io)", () => {
    const cards = [checklistCard({ number: "001" })];
    const items = [collectionItem({ setName: "Oscuridad Absoluta", number: "1/120" })];
    const { owned } = computeSetChecklistCompletion(cards, items, ["Oscuridad Absoluta"], "cl1");
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
    kind: "official",
    pokemonNames: null,
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

  it("en un binder, encuentra la carta por su propia expansión aunque el título del checklist no se parezca a ningún set real", () => {
    const binder = setChecklist({ id: "binder1", setName: "Slowpoke y Slowbro", setNameEs: "Slowpoke y Slowbro", kind: "binder" });
    const card = checklistCard({ number: "1", name: "Slowpoke", setName: "Base Set" });
    const result = findChecklistCardImage("Base Set", "1/102", [binder], { binder1: [card] });
    expect(result).toEqual(card);
  });
});

describe("findMatchingCollectionItems", () => {
  it("encuentra ejemplares con mismo número+variante y expansión parecida, sumando su cantidad", () => {
    const items = [
      collectionItem({ id: "i1", setName: "Oscuridad Absoluta", number: "48/120", variant: "holo", quantity: 2 }),
      collectionItem({ id: "i2", setName: "Oscuridad Absoluta", number: "48/120", variant: "holo", quantity: 1 }),
    ];
    const result = findMatchingCollectionItems({ setName: "Oscuridad Absoluta", number: "48/120", variant: "holo" }, items);
    expect(result.map((i) => i.id)).toEqual(["i1", "i2"]);
  });

  it("no confunde variantes distintas de la misma carta", () => {
    const items = [collectionItem({ setName: "Oscuridad Absoluta", number: "48/120", variant: "normal" })];
    const result = findMatchingCollectionItems({ setName: "Oscuridad Absoluta", number: "48/120", variant: "holo" }, items);
    expect(result).toHaveLength(0);
  });

  it("ignora cartas de otro set aunque compartan número y variante", () => {
    const items = [collectionItem({ setName: "Base Set", number: "48/102", variant: "holo" })];
    const result = findMatchingCollectionItems({ setName: "Oscuridad Absoluta", number: "48/120", variant: "holo" }, items);
    expect(result).toHaveLength(0);
  });

  it("sin ejemplares que coincidan, devuelve un array vacío", () => {
    expect(findMatchingCollectionItems({ setName: "Oscuridad Absoluta", number: "48/120", variant: "holo" }, [])).toEqual([]);
  });
});

describe("findChecklistsContainingCard", () => {
  it("devuelve los checklists cuyo listado incluye esta carta exacta (número+variante)", () => {
    const official = setChecklist({ id: "cl1", setName: "Pitch Black", setNameEs: "Oscuridad Absoluta" });
    const binder = setChecklist({ id: "binder1", setName: "Slowpoke y Slowbro", setNameEs: "Slowpoke y Slowbro", kind: "binder" });
    const cardsByChecklist = {
      cl1: [checklistCard({ number: "48", variant: "holo" })],
      binder1: [checklistCard({ number: "1", name: "Slowpoke", setName: "Oscuridad Absoluta", variant: "normal" })],
    };
    const result = findChecklistsContainingCard({ setName: "Oscuridad Absoluta", number: "48/120", variant: "holo" }, [official, binder], cardsByChecklist);
    expect(result.map((c) => c.id)).toEqual(["cl1"]);
  });

  it("no ofrece un checklist que no contenga la carta, aunque esté sincronizado", () => {
    const official = setChecklist({ id: "cl1", setName: "Pitch Black", setNameEs: "Oscuridad Absoluta" });
    const cardsByChecklist = { cl1: [checklistCard({ number: "99", variant: "holo" })] };
    const result = findChecklistsContainingCard({ setName: "Oscuridad Absoluta", number: "48/120", variant: "holo" }, [official], cardsByChecklist);
    expect(result).toHaveLength(0);
  });

  it("distingue variantes: un set con la normal no cuenta como contener la holo", () => {
    const official = setChecklist({ id: "cl1", setName: "Pitch Black", setNameEs: "Oscuridad Absoluta" });
    const cardsByChecklist = { cl1: [checklistCard({ number: "48", variant: "normal" })] };
    const result = findChecklistsContainingCard({ setName: "Oscuridad Absoluta", number: "48/120", variant: "holo" }, [official], cardsByChecklist);
    expect(result).toHaveLength(0);
  });
});

describe("findOwnedCollectionItemIds", () => {
  it("encuentra los ids de los ejemplares que coinciden por número y por set (parecido)", () => {
    const items = [
      collectionItem({ id: "c1", setName: "Oscuridad Absoluta", number: "1/120" }),
      collectionItem({ id: "c2", setName: "Oscuridad Absoluta", number: "2/120" }),
      collectionItem({ id: "c3", setName: "Base Set", number: "1/102" }), // otro set, no cuenta
    ];
    const ids = findOwnedCollectionItemIds([{ number: "1", variant: "normal" }], items, ["Pitch Black", "Oscuridad Absoluta"], "cl1");
    expect(ids).toEqual(["c1"]);
  });

  it("devuelve todos los ids si hay filas duplicadas para el mismo número", () => {
    const items = [
      collectionItem({ id: "c1", setName: "Oscuridad Absoluta", number: "1/120" }),
      collectionItem({ id: "c2", setName: "Oscuridad Absoluta", number: "1/120" }),
    ];
    const ids = findOwnedCollectionItemIds([{ number: "1", variant: "normal" }], items, ["Oscuridad Absoluta"], "cl1");
    expect(ids).toEqual(["c1", "c2"]);
  });

  it("normaliza ceros a la izquierda al comparar (checklist con '001', colección con '1')", () => {
    const items = [collectionItem({ id: "c1", setName: "Oscuridad Absoluta", number: "1/120" })];
    const ids = findOwnedCollectionItemIds([{ number: "001", variant: "normal" }], items, ["Oscuridad Absoluta"], "cl1");
    expect(ids).toEqual(["c1"]);
  });

  it("sin coincidencias, devuelve una lista vacía", () => {
    const items = [collectionItem({ id: "c1", setName: "Base Set", number: "1/102" })];
    expect(findOwnedCollectionItemIds([{ number: "1", variant: "normal" }], items, ["Oscuridad Absoluta"], "cl1")).toEqual([]);
  });

  it("no confunde variantes: pedir la de reverso no devuelve la normal del mismo número", () => {
    const items = [collectionItem({ id: "c1", setName: "Oscuridad Absoluta", number: "1/120", variant: "normal" })];
    const ids = findOwnedCollectionItemIds([{ number: "1", variant: "reverse" }], items, ["Oscuridad Absoluta"], "cl1");
    expect(ids).toEqual([]);
  });

  it("con la expansión propia de cada carta (binder), no confunde dos cartas con el mismo número de expansiones distintas", () => {
    const items = [
      collectionItem({ id: "c1", setName: "Base Set", number: "1/102" }),
      collectionItem({ id: "c2", setName: "Jungla", number: "1/64" }),
    ];
    const ids = findOwnedCollectionItemIds(
      [{ number: "1", variant: "normal", setName: "Base Set" }],
      items,
      ["Slowpoke y Slowbro"],
      "cl1",
    );
    expect(ids).toEqual(["c1"]);
  });
});

describe("computeSetChecklistCompletion — variantes", () => {
  it("una carta con normal y reverso son dos entradas independientes del checklist", () => {
    const cards = [
      checklistCard({ id: "n1", number: "2", name: "Grubbin", variant: "normal" }),
      checklistCard({ id: "r1", number: "2", name: "Grubbin", variant: "reverse" }),
    ];
    const items = [collectionItem({ setName: "Oscuridad Absoluta", number: "2/120", variant: "normal" })];
    const { owned, missing } = computeSetChecklistCompletion(cards, items, ["Oscuridad Absoluta"], "cl1");

    expect(owned.map((c) => c.id)).toEqual(["n1"]);
    expect(missing.map((c) => c.id)).toEqual(["r1"]);
  });

  it("tener las dos variantes marca las dos entradas como 'owned'", () => {
    const cards = [
      checklistCard({ id: "n1", number: "2", variant: "normal" }),
      checklistCard({ id: "r1", number: "2", variant: "reverse" }),
    ];
    const items = [
      collectionItem({ id: "i1", setName: "Oscuridad Absoluta", number: "2/120", variant: "normal" }),
      collectionItem({ id: "i2", setName: "Oscuridad Absoluta", number: "2/120", variant: "reverse" }),
    ];
    const { owned } = computeSetChecklistCompletion(cards, items, ["Oscuridad Absoluta"], "cl1");
    expect(owned.map((c) => c.id).sort()).toEqual(["n1", "r1"]);
  });
});

describe("computeSetChecklistCompletion — binder (cartas de varias expansiones)", () => {
  it("compara cada carta con la expansión propia, no con las pistas del checklist entero (que en un binder es solo un título)", () => {
    // Dos cartas del binder comparten número local "1" pero son de expansiones
    // distintas — no deben confundirse entre sí aunque el checklist en sí ("Slowpoke y
    // Slowbro") no se parezca a ningún nombre de set real.
    const cards = [
      checklistCard({ id: "base-1", number: "1", name: "Slowpoke", setName: "Base Set" }),
      checklistCard({ id: "jungla-1", number: "1", name: "Slowpoke", setName: "Jungla" }),
    ];
    const items = [collectionItem({ setName: "Base Set", number: "1/102" })];
    const { owned, missing } = computeSetChecklistCompletion(cards, items, ["Slowpoke y Slowbro"], "cl1");

    expect(owned.map((c) => c.id)).toEqual(["base-1"]);
    expect(missing.map((c) => c.id)).toEqual(["jungla-1"]);
  });
});

describe("computeSetChecklistCompletion / findOwnedCollectionItemIds — aislamiento entre checklists", () => {
  // Bug real en producción (2026-07): un binder reúne un Pokémon de cualquier expansión
  // donde haya salido, así que si esa expansión también está sincronizada como set
  // oficial aparte, la misma carta real (mismo número+variante+expansión) aparece en las
  // dos listas — marcarla como tuya en una la marcaba automáticamente como tuya en la
  // otra, sin que el usuario lo pidiera ahí. Caso real: Slowbro/Slowpoke de "Oscuridad
  // Absoluta", presentes tanto en el set oficial como en el binder "Slowpoke y Slowbro".
  it("un ejemplar marcado desde un checklist NO cuenta como tuyo en otro checklist distinto, aunque coincida la carta", () => {
    const card = checklistCard({ number: "30", name: "Slowbro", setName: "Oscuridad Absoluta", variant: "normal" });
    const items = [
      collectionItem({ setName: "Oscuridad Absoluta", number: "30/120", variant: "normal", checklistId: "oficial-oscuridad" }),
    ];
    const { owned: ownedEnOficial } = computeSetChecklistCompletion([card], items, ["Oscuridad Absoluta"], "oficial-oscuridad");
    expect(ownedEnOficial).toHaveLength(1);

    const { owned: ownedEnBinder, missing: missingEnBinder } = computeSetChecklistCompletion(
      [card],
      items,
      ["Slowpoke y Slowbro"],
      "binder-slowbro",
    );
    expect(ownedEnBinder).toHaveLength(0);
    expect(missingEnBinder).toHaveLength(1);
  });

  it("findOwnedCollectionItemIds tampoco encuentra, para desmarcar, un ejemplar que pertenece a otro checklist", () => {
    const items = [
      collectionItem({ id: "c1", setName: "Oscuridad Absoluta", number: "30/120", variant: "normal", checklistId: "oficial-oscuridad" }),
    ];
    const ids = findOwnedCollectionItemIds(
      [{ number: "30", variant: "normal", setName: "Oscuridad Absoluta" }],
      items,
      ["Slowpoke y Slowbro"],
      "binder-slowbro",
    );
    expect(ids).toEqual([]);
  });

  it("un ejemplar sin checklist de origen (alta manual o de antes de este campo) sigue comparándose por texto en cualquier checklist, como antes", () => {
    const card = checklistCard({ number: "30", name: "Slowbro", setName: "Oscuridad Absoluta", variant: "normal" });
    const items = [collectionItem({ setName: "Oscuridad Absoluta", number: "30/120", variant: "normal", checklistId: null })];

    const { owned: ownedEnOficial } = computeSetChecklistCompletion([card], items, ["Oscuridad Absoluta"], "oficial-oscuridad");
    const { owned: ownedEnBinder } = computeSetChecklistCompletion([card], items, ["Slowpoke y Slowbro"], "binder-slowbro");

    expect(ownedEnOficial).toHaveLength(1);
    expect(ownedEnBinder).toHaveLength(1);
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

  it("sigue sumando un ítem 'countedElsewhere' (a diferencia de totalPlanInvested): el total del mes es autocontenido, no se combina con otros datos", () => {
    const items = [planItem({ category: "comprar", referencePrice: 59, done: true, countedElsewhere: true })];
    const [group] = groupPlanByMonth(items);
    const estimate = estimatePlanMonth(group);
    expect(estimate.amount).toBe(59);
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

  it("excluye un ítem 'countedElsewhere' (ya registrado con su precio real en Colección/Sellado, no sumar dos veces)", () => {
    const items = [
      planItem({ id: "p1", month: "2026-09", category: "comprar", referencePrice: 55.9, done: true, countedElsewhere: true }),
      planItem({ id: "p2", month: "2026-09", category: "comprar", referencePrice: 25, done: true, countedElsewhere: false }),
    ];
    expect(totalPlanInvested(items)).toBe(25);
  });

  it("sin ítems 'comprar' hechos con precio, devuelve 0", () => {
    expect(totalPlanInvested([])).toBe(0);
  });
});

describe("mostValuableItem", () => {
  it("devuelve el ejemplar con mayor valor estimado por unidad", () => {
    const items = [
      collectionItem({ id: "c1", name: "Eevee", estimatedValueOverride: 5 }),
      collectionItem({ id: "c2", name: "Mewtwo", estimatedValueOverride: 250 }),
      collectionItem({ id: "c3", name: "Pikachu", estimatedValueOverride: 40 }),
    ];
    expect(mostValuableItem(items)?.name).toBe("Mewtwo");
  });

  it("ignora los ejemplares sin valor conocido, aunque tengan más cantidad", () => {
    const items = [
      collectionItem({ id: "c1", name: "Sin valor", estimatedValueOverride: null, quantity: 99 }),
      collectionItem({ id: "c2", name: "Con valor", estimatedValueOverride: 1 }),
    ];
    expect(mostValuableItem(items)?.name).toBe("Con valor");
  });

  it("sin colección, o sin ningún valor conocido, devuelve null", () => {
    expect(mostValuableItem([])).toBeNull();
    expect(mostValuableItem([collectionItem({ estimatedValueOverride: null })])).toBeNull();
  });
});

describe("collectionRarityDistribution / collectionLanguageDistribution", () => {
  it("suma por cantidad (no por fila), de mayor a menor", () => {
    const items = [
      collectionItem({ id: "c1", rarity: "Rare", quantity: 1 }),
      collectionItem({ id: "c2", rarity: "Common", quantity: 3 }),
      collectionItem({ id: "c3", rarity: "Common", quantity: 2 }),
    ];
    expect(collectionRarityDistribution(items)).toEqual([
      { key: "Common", count: 5 },
      { key: "Rare", count: 1 },
    ]);
  });

  it("agrupa la rareza desconocida bajo 'Sin rareza', sin inventar una", () => {
    const items = [collectionItem({ rarity: null })];
    expect(collectionRarityDistribution(items)).toEqual([{ key: "Sin rareza", count: 1 }]);
  });

  it("distribución por idioma, por código tal cual (la pantalla decide la etiqueta)", () => {
    const items = [
      collectionItem({ id: "c1", language: "es" }),
      collectionItem({ id: "c2", language: "en" }),
      collectionItem({ id: "c3", language: "es" }),
    ];
    expect(collectionLanguageDistribution(items)).toEqual([
      { key: "es", count: 2 },
      { key: "en", count: 1 },
    ]);
  });
});

describe("sortCollectionItems", () => {
  it("por nombre, A-Z", () => {
    const items = [collectionItem({ name: "Zubat" }), collectionItem({ name: "Abra" })];
    expect(sortCollectionItems(items, "name").map((i) => i.name)).toEqual(["Abra", "Zubat"]);
  });

  it("por valor estimado, de mayor a menor — sin valor conocido va al final", () => {
    const items = [
      collectionItem({ name: "Barato", estimatedValueOverride: 5 }),
      collectionItem({ name: "Sin valor", estimatedValueOverride: null }),
      collectionItem({ name: "Caro", estimatedValueOverride: 200 }),
    ];
    expect(sortCollectionItems(items, "value_desc").map((i) => i.name)).toEqual(["Caro", "Barato", "Sin valor"]);
  });

  it("por fecha de compra más reciente — sin fecha va al final", () => {
    const items = [
      collectionItem({ name: "Antigua", purchaseDate: "2026-01-01" }),
      collectionItem({ name: "Sin fecha", purchaseDate: null }),
      collectionItem({ name: "Reciente", purchaseDate: "2026-07-01" }),
    ];
    expect(sortCollectionItems(items, "purchase_date_desc").map((i) => i.name)).toEqual(["Reciente", "Antigua", "Sin fecha"]);
  });

  it("no muta el array original", () => {
    const items = [collectionItem({ name: "Zubat" }), collectionItem({ name: "Abra" })];
    sortCollectionItems(items, "name");
    expect(items.map((i) => i.name)).toEqual(["Zubat", "Abra"]);
  });
});

describe("summarizeChecklistCompletion", () => {
  it("porcentaje, coste de completar (solo las que tienen precio) y cuántas faltan sin precio", () => {
    const checklist = setChecklist({ id: "cl1", setNameEs: "Oscuridad Absoluta" });
    const cards = [
      checklistCard({ id: "c1", number: "1", referencePrice: 10 }),
      checklistCard({ id: "c2", number: "2", referencePrice: 5 }),
      checklistCard({ id: "c3", number: "3", referencePrice: null }),
    ];
    const items = [collectionItem({ setName: "Oscuridad Absoluta", number: "1/120" })];

    const [summary] = summarizeChecklistCompletion([checklist], { cl1: cards }, items);
    expect(summary.title).toBe("Oscuridad Absoluta");
    expect(summary.ownedCount).toBe(1);
    expect(summary.totalCount).toBe(3);
    expect(summary.pct).toBe(33);
    expect(summary.missingCost).toBe(5); // solo la #2, la #3 no tiene precio
    expect(summary.missingWithoutPrice).toBe(1);
  });

  it("hereda el aislamiento entre checklists: una carta marcada en otro checklist no cuenta aquí", () => {
    const checklist = setChecklist({ id: "cl1", setNameEs: "Oscuridad Absoluta" });
    const cards = [checklistCard({ id: "c1", number: "1", referencePrice: 10 })];
    const items = [collectionItem({ setName: "Oscuridad Absoluta", number: "1/120", checklistId: "otro-checklist" })];

    const [summary] = summarizeChecklistCompletion([checklist], { cl1: cards }, items);
    expect(summary.ownedCount).toBe(0);
    expect(summary.missingCost).toBe(10);
  });

  it("checklist vacío (sin cartas cargadas aún): 0/0, 0%", () => {
    const checklist = setChecklist({ id: "cl1" });
    const [summary] = summarizeChecklistCompletion([checklist], {}, []);
    expect(summary).toEqual({
      checklistId: "cl1",
      title: "Oscuridad Absoluta",
      ownedCount: 0,
      totalCount: 0,
      pct: 0,
      missingCost: 0,
      missingWithoutPrice: 0,
    });
  });
});
