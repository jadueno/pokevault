import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../../components/ConfirmProvider";
import type { WishlistItem } from "../../domain/types";
import { WishlistScreen } from "./WishlistScreen";

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

function renderScreen(items: WishlistItem[]) {
  const handlers = {
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn().mockResolvedValue(undefined),
    onMoveToCollection: vi.fn().mockResolvedValue(undefined),
  };
  render(
    <ConfirmProvider>
      <WishlistScreen items={items} {...handlers} />
    </ConfirmProvider>,
  );
  return handlers;
}

describe("WishlistScreen", () => {
  it("sin elementos, muestra el aviso de wishlist vacía", () => {
    renderScreen([]);
    expect(screen.getByText(/Todavía no hay nada en tu wishlist/)).toBeInTheDocument();
  });

  it("agrupa los elementos por mes objetivo", () => {
    renderScreen([
      wishlistItem({ id: "w1", targetMonth: "2026-08", name: "Charizard" }),
      wishlistItem({ id: "w2", targetMonth: null, name: "Pikachu" }),
    ]);
    expect(screen.getByText("Agosto de 2026")).toBeInTheDocument();
    expect(screen.getByText("Sin mes objetivo")).toBeInTheDocument();
  });

  it("pide confirmación antes de quitar un elemento", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([wishlistItem()]);

    await user.click(screen.getByRole("button", { name: "Quitar Charizard de la wishlist" }));
    expect(handlers.onRemove).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(handlers.onRemove).toHaveBeenCalledWith("w1");
  });

  it("abre el formulario para registrar la compra y moverla a la colección", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([wishlistItem()]);

    await user.click(screen.getByRole("button", { name: "Ya la tengo" }));
    expect(screen.getByText("Registrar la compra de Charizard")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Registrar compra" }));
    expect(handlers.onMoveToCollection).toHaveBeenCalledWith("w1", expect.objectContaining({ language: "es" }));
  });
});
