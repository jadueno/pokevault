import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CollectionItem, CollectionSummary, PlanItem, SealedPurchase, SetChecklist, SetChecklistCard } from "../../domain/types";
import { DashboardScreen } from "./DashboardScreen";

function summary(overrides: Partial<CollectionSummary> = {}): CollectionSummary {
  return { totalItems: 1, totalQuantity: 1, totalValue: 350, itemsWithoutValue: 0, totalInvested: 300, ...overrides };
}

function collectionItem(overrides: Partial<CollectionItem> = {}): CollectionItem {
  return {
    id: "c1",
    name: "Eevee",
    setName: "Jungla",
    number: null,
    rarity: "Common",
    variant: "normal",
    language: "es",
    condition: "near_mint",
    quantity: 1,
    acquisitionType: "purchased_single",
    sealedPurchaseId: null,
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

function checklist(overrides: Partial<SetChecklist> = {}): SetChecklist {
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

function checklistCard(overrides: Partial<SetChecklistCard> = {}): SetChecklistCard {
  return {
    id: "cc1",
    checklistId: "cl1",
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

function planItem(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: "p1",
    month: "2026-08",
    category: "comprar",
    description: "1x ETB",
    referencePrice: 59,
    searchTerm: null,
    done: true,
    position: 0,
    ...overrides,
  };
}

describe("DashboardScreen", () => {
  it("suma el valor de la colección y del producto sellado en el total", () => {
    const sealed: SealedPurchase[] = [
      {
        id: "s1",
        productName: "Sobre",
        productType: "booster_pack",
        quantity: 1,
        purchasePrice: 5,
        purchaseCurrency: "EUR",
        purchaseDate: null,
        estimatedValueOverride: 8,
        estimatedValueOverrideAt: null,
        estimatedValueOverrideNote: null,
        location: null,
        notes: null,
        photo: null,
      },
    ];
    render(<DashboardScreen summary={summary()} items={[]} sealedItems={sealed} planItems={[]} checklists={[]} cardsByChecklist={{}} />);

    // Intl.NumberFormat usa un espacio de no separación antes de "€" — \s lo cubre.
    expect(screen.getByText(/358,00\s€/)).toBeInTheDocument(); // 350 + 8
    expect(screen.getByText(/305,00\s€/)).toBeInTheDocument(); // 300 + 5
  });

  it("muestra la ganancia en verde y con signo cuando es positiva", () => {
    render(<DashboardScreen summary={summary({ totalValue: 350, totalInvested: 300 })} items={[]} sealedItems={[]} planItems={[]} checklists={[]} cardsByChecklist={{}} />);
    const gainCard = screen.getByText("Ganancia / pérdida estimada").closest("div");
    expect(gainCard?.textContent).toMatch(/\+50,00\s€/);
  });

  it("avisa (sin sumarlos como 0) de los ejemplares sin valor conocido", () => {
    const { container } = render(
      <DashboardScreen summary={summary({ itemsWithoutValue: 2 })} items={[]} sealedItems={[]} planItems={[]} checklists={[]} cardsByChecklist={{}} />,
    );
    expect(container.textContent).toContain("2 ejemplares sin valor de mercado conocido");
  });

  it("no muestra el aviso si todos los ejemplares tienen valor conocido", () => {
    render(<DashboardScreen summary={summary({ itemsWithoutValue: 0 })} items={[]} sealedItems={[]} planItems={[]} checklists={[]} cardsByChecklist={{}} />);
    expect(screen.queryByText(/sin valor de mercado conocido/)).not.toBeInTheDocument();
  });

  it("suma al invertido las compras del plan ya hechas (categoría 'comprar')", () => {
    const items: PlanItem[] = [
      planItem({ id: "p1", referencePrice: 59, done: true }),
      planItem({ id: "p2", referencePrice: 25, done: false }), // no hecho, no cuenta
      planItem({ id: "p3", category: "guardar_sellado", referencePrice: 120, done: true }), // ya era tuyo, no cuenta
      planItem({ id: "p4", referencePrice: null, done: true }), // sin precio, no cuenta
    ];
    render(<DashboardScreen summary={summary({ totalInvested: 300 })} items={[]} sealedItems={[]} planItems={items} checklists={[]} cardsByChecklist={{}} />);

    // 300 (colección) + 59 (solo el ítem "comprar" hecho y con precio) = 359,00 €
    expect(screen.getByText(/359,00\s€/)).toBeInTheDocument();
  });

  it("muestra la carta más valiosa y la distribución por rareza/idioma", () => {
    const items = [
      collectionItem({ id: "c1", name: "Pikachu", rarity: "Common", language: "es", estimatedValueOverride: 5 }),
      collectionItem({ id: "c2", name: "Mewtwo", rarity: "Rare", language: "en", estimatedValueOverride: 250 }),
    ];
    render(
      <DashboardScreen summary={summary()} items={items} sealedItems={[]} planItems={[]} checklists={[]} cardsByChecklist={{}} />,
    );

    expect(screen.getByText("Carta más valiosa")).toBeInTheDocument();
    expect(screen.getByText("Mewtwo")).toBeInTheDocument();
    expect(screen.getByText("Common")).toBeInTheDocument();
    expect(screen.getByText("Rare")).toBeInTheDocument();
    expect(screen.getByText("ES")).toBeInTheDocument();
    expect(screen.getByText("EN")).toBeInTheDocument();
  });

  it("sin ninguna carta con valor conocido, avisa en vez de mostrar una carta más valiosa inventada", () => {
    render(
      <DashboardScreen
        summary={summary()}
        items={[collectionItem({ estimatedValueOverride: null })]}
        sealedItems={[]}
        planItems={[]}
        checklists={[]}
        cardsByChecklist={{}}
      />,
    );
    expect(screen.getByText("Todavía no hay ninguna carta con valor estimado.")).toBeInTheDocument();
  });

  it("resume el % completado y el coste de completar cada set/binder sincronizado", () => {
    const cl = checklist({ id: "cl1", setNameEs: "Oscuridad Absoluta" });
    const cards = [
      checklistCard({ id: "cc1", number: "1", referencePrice: 10 }),
      checklistCard({ id: "cc2", number: "2", referencePrice: 5 }),
    ];
    const owned = [collectionItem({ id: "c1", setName: "Oscuridad Absoluta", number: "1/120" })];
    render(
      <DashboardScreen
        summary={summary()}
        items={owned}
        sealedItems={[]}
        planItems={[]}
        checklists={[cl]}
        cardsByChecklist={{ cl1: cards }}
      />,
    );

    expect(screen.getByText("Sets y binders")).toBeInTheDocument();
    expect(screen.getByText("1/2 (50%)")).toBeInTheDocument();
    expect(screen.getByText(/5,00\s€ para completarlo(?!s)/)).toBeInTheDocument();
  });

  it("sin ningún set/binder sincronizado, no muestra la tarjeta de sets", () => {
    render(
      <DashboardScreen summary={summary()} items={[]} sealedItems={[]} planItems={[]} checklists={[]} cardsByChecklist={{}} />,
    );
    expect(screen.queryByText("Sets y binders")).not.toBeInTheDocument();
  });
});
