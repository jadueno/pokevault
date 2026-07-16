import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../../components/ConfirmProvider";
import type { SealedPurchase } from "../../domain/types";
import { SelladoScreen } from "./SelladoScreen";

function purchase(overrides: Partial<SealedPurchase> = {}): SealedPurchase {
  return {
    id: "s1",
    productName: "Sobre Evoluciones Prismáticas",
    productType: "booster_pack",
    quantity: 1,
    purchasePrice: 5.5,
    purchaseCurrency: "EUR",
    purchaseDate: "2026-07-01",
    estimatedValueOverride: null,
    estimatedValueOverrideAt: null,
    estimatedValueOverrideNote: null,
    location: "Cajón",
    notes: null,
    photo: null,
    ...overrides,
  };
}

function renderScreen(items: SealedPurchase[]) {
  const handlers = {
    onAdd: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn().mockResolvedValue(undefined),
    onOverrideValue: vi.fn().mockResolvedValue(undefined),
  };
  render(
    <ConfirmProvider>
      <SelladoScreen items={items} {...handlers} />
    </ConfirmProvider>,
  );
  return handlers;
}

describe("SelladoScreen", () => {
  it("sin compras, muestra el aviso correspondiente", () => {
    renderScreen([]);
    expect(screen.getByText(/Todavía no has registrado ningún producto sellado/)).toBeInTheDocument();
  });

  it("lista las compras registradas", () => {
    renderScreen([purchase()]);
    expect(screen.getByText("Sobre Evoluciones Prismáticas")).toBeInTheDocument();
    expect(screen.getByText("5,50 €")).toBeInTheDocument();
  });

  it("abre el formulario de nueva compra y lo envía", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([]);

    await user.click(screen.getByRole("button", { name: "+ Añadir compra" }));
    await user.type(screen.getByLabelText("Nombre del producto"), "Caja Escarlata y Púrpura");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(handlers.onAdd).toHaveBeenCalledWith(expect.objectContaining({ productName: "Caja Escarlata y Púrpura" }));
  });

  it("permite estimar el valor a mano cuando todavía no se conoce", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([purchase()]);

    await user.click(screen.getByRole("button", { name: "Sin estimar" }));
    const input = screen.getByRole("spinbutton");
    await user.type(input, "8");
    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(handlers.onOverrideValue).toHaveBeenCalledWith("s1", 8, "Estimado a mano");
  });
});
