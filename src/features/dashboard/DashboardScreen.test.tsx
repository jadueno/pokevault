import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { CollectionSummary, SealedPurchase } from "../../domain/types";
import { DashboardScreen } from "./DashboardScreen";

function summary(overrides: Partial<CollectionSummary> = {}): CollectionSummary {
  return { totalItems: 1, totalQuantity: 1, totalValue: 350, itemsWithoutValue: 0, totalInvested: 300, ...overrides };
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
    render(<DashboardScreen summary={summary()} sealedItems={sealed} />);

    // Intl.NumberFormat usa un espacio de no separación antes de "€" — \s lo cubre.
    expect(screen.getByText(/358,00\s€/)).toBeInTheDocument(); // 350 + 8
    expect(screen.getByText(/305,00\s€/)).toBeInTheDocument(); // 300 + 5
  });

  it("muestra la ganancia en verde y con signo cuando es positiva", () => {
    render(<DashboardScreen summary={summary({ totalValue: 350, totalInvested: 300 })} sealedItems={[]} />);
    const gainCard = screen.getByText("Ganancia / pérdida estimada").closest("div");
    expect(gainCard?.textContent).toMatch(/\+50,00\s€/);
  });

  it("avisa (sin sumarlos como 0) de los ejemplares sin valor conocido", () => {
    const { container } = render(<DashboardScreen summary={summary({ itemsWithoutValue: 2 })} sealedItems={[]} />);
    expect(container.textContent).toContain("2 ejemplares sin valor de mercado conocido");
  });

  it("no muestra el aviso si todos los ejemplares tienen valor conocido", () => {
    render(<DashboardScreen summary={summary({ itemsWithoutValue: 0 })} sealedItems={[]} />);
    expect(screen.queryByText(/sin valor de mercado conocido/)).not.toBeInTheDocument();
  });
});
