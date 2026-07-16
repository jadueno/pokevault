import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../../components/ConfirmProvider";
import type { CollectionItem } from "../../domain/types";
import { ColeccionScreen } from "./ColeccionScreen";

function item(overrides: Partial<CollectionItem> = {}): CollectionItem {
  return {
    id: "i1",
    name: "Charizard",
    setName: "Base",
    number: "4",
    rarity: "Rare Holo",
    language: "es",
    condition: "near_mint",
    quantity: 1,
    acquisitionType: "purchased_single",
    sealedPurchaseId: null,
    purchasePrice: 300,
    purchaseCurrency: "EUR",
    purchaseDate: "2026-07-01",
    isGraded: false,
    gradingCompany: null,
    grade: null,
    estimatedValueOverride: 350,
    estimatedValueOverrideAt: null,
    estimatedValueOverrideNote: null,
    notes: null,
    photo: null,
    ...overrides,
  };
}

function renderScreen(items: CollectionItem[]) {
  const handlers = { onRemove: vi.fn().mockResolvedValue(undefined), onOverrideValue: vi.fn().mockResolvedValue(undefined) };
  render(
    <ConfirmProvider>
      <ColeccionScreen items={items} {...handlers} />
    </ConfirmProvider>,
  );
  return handlers;
}

describe("ColeccionScreen", () => {
  it("sin ejemplares, muestra el aviso de colección vacía", () => {
    renderScreen([]);
    expect(screen.getByText(/Todavía no has añadido ninguna carta/)).toBeInTheDocument();
  });

  it("lista los ejemplares con precio de compra y valor estimado", () => {
    renderScreen([item()]);
    expect(screen.getByText("Charizard")).toBeInTheDocument();
    expect(screen.getByText("300,00 €")).toBeInTheDocument();
    expect(screen.getByText("350,00 €")).toBeInTheDocument();
  });

  it("indica cuando un ejemplar no tiene precio de compra por haber salido de un sobre", () => {
    renderScreen([item({ purchasePrice: null, acquisitionType: "pulled_from_pack" })]);
    expect(screen.getByText(/Sin precio \(salió de un sobre\)/)).toBeInTheDocument();
  });

  it("pide confirmación antes de eliminar un ejemplar", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()]);

    await user.click(screen.getByRole("button", { name: "Eliminar ejemplar de Charizard" }));
    expect(handlers.onRemove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(handlers.onRemove).toHaveBeenCalledWith("i1");
  });

  it("permite corregir el valor estimado a mano", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()]);

    await user.click(screen.getByText("350,00 €"));
    const input = screen.getByDisplayValue("350");
    await user.clear(input);
    await user.type(input, "400");
    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(handlers.onOverrideValue).toHaveBeenCalledWith("i1", 400, "Corrección manual");
  });

  it("filtra la colección por nombre con el buscador propio", async () => {
    const user = userEvent.setup();
    renderScreen([item({ id: "i1", name: "Charizard" }), item({ id: "i2", name: "Pikachu", estimatedValueOverride: 5 })]);

    await user.type(screen.getByPlaceholderText("Buscar en tu colección…"), "pika");

    expect(screen.getByText("Pikachu")).toBeInTheDocument();
    expect(screen.queryByText("Charizard")).not.toBeInTheDocument();
  });
});
