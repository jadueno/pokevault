import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../../components/ConfirmProvider";
import type { WishlistItem } from "../../domain/types";
import { WishlistScreen } from "./WishlistScreen";

vi.mock("../../data/imageCapture", () => ({
  compressImage: vi.fn().mockResolvedValue("data:image/jpeg;base64,AAAA"),
}));

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
    onAdd: vi.fn().mockResolvedValue(undefined),
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

  it("filtra la wishlist por nombre con el buscador propio", async () => {
    const user = userEvent.setup();
    renderScreen([wishlistItem({ id: "w1", name: "Charizard" }), wishlistItem({ id: "w2", name: "Pikachu" })]);

    await user.type(screen.getByPlaceholderText("Buscar en tu wishlist…"), "pika");

    expect(screen.getByText("Pikachu")).toBeInTheDocument();
    expect(screen.queryByText("Charizard")).not.toBeInTheDocument();
  });

  it("permite subir una foto a un deseo ya existente", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([wishlistItem()]);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["foto"], "carta.jpg", { type: "image/jpeg" });
    await user.upload(input, file);

    expect(handlers.onUpdate).toHaveBeenCalledWith("w1", expect.objectContaining({ photo: "data:image/jpeg;base64,AAAA" }));
  });

  it("abre el formulario de nuevo deseo y lo envía", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([]);

    await user.click(screen.getByRole("button", { name: "+ Añadir deseo" }));
    await user.type(screen.getByLabelText("Nombre"), "Mewtwo");
    await user.click(screen.getByRole("button", { name: "Añadir a la wishlist" }));

    expect(handlers.onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: "Mewtwo" }));
  });
});
