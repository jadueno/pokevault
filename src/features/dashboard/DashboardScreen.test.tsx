import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
    render(<DashboardScreen summary={summary()} sealedItems={sealed} onOpenPlan={vi.fn()} />);

    // Intl.NumberFormat usa un espacio de no separación antes de "€" — \s lo cubre.
    expect(screen.getByText(/358,00\s€/)).toBeInTheDocument(); // 350 + 8
    expect(screen.getByText(/305,00\s€/)).toBeInTheDocument(); // 300 + 5
  });

  it("muestra la ganancia en verde y con signo cuando es positiva", () => {
    render(<DashboardScreen summary={summary({ totalValue: 350, totalInvested: 300 })} sealedItems={[]} onOpenPlan={vi.fn()} />);
    const gainCard = screen.getByText("Ganancia / pérdida estimada").closest("div");
    expect(gainCard?.textContent).toMatch(/\+50,00\s€/);
  });

  it("avisa (sin sumarlos como 0) de los ejemplares sin valor conocido", () => {
    const { container } = render(
      <DashboardScreen summary={summary({ itemsWithoutValue: 2 })} sealedItems={[]} onOpenPlan={vi.fn()} />,
    );
    expect(container.textContent).toContain("2 ejemplares sin valor de mercado conocido");
  });

  it("no muestra el aviso si todos los ejemplares tienen valor conocido", () => {
    render(<DashboardScreen summary={summary({ itemsWithoutValue: 0 })} sealedItems={[]} onOpenPlan={vi.fn()} />);
    expect(screen.queryByText(/sin valor de mercado conocido/)).not.toBeInTheDocument();
  });

  it("la tarjeta 'Ver plan' llama a onOpenPlan al pulsarla", async () => {
    const user = userEvent.setup();
    const onOpenPlan = vi.fn();
    render(<DashboardScreen summary={summary()} sealedItems={[]} onOpenPlan={onOpenPlan} />);

    await user.click(screen.getByRole("button", { name: /Ver plan/ }));
    expect(onOpenPlan).toHaveBeenCalled();
  });
});
