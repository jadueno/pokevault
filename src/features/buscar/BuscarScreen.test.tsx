import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CatalogCard } from "../../domain/types";
import { BuscarScreen } from "./BuscarScreen";

function card(overrides: Partial<CatalogCard> = {}): CatalogCard {
  return {
    id: "c1",
    provider: "fake",
    externalId: "base1-4",
    setId: "s1",
    name: "Charizard",
    number: "4",
    rarity: "Rare Holo",
    artist: "Mitsuhiro Arita",
    supertype: "Pokémon",
    subtypes: [],
    types: ["Fire"],
    imageSmallUrl: null,
    imageLargeUrl: null,
    currentPrice: 120,
    currentPriceCurrency: "EUR",
    priceUpdatedAt: "2026-07-01T00:00:00.000Z",
    priceSource: "fake",
    ...overrides,
  };
}

function fakeCatalog(results: CatalogCard[] = []) {
  return {
    sets: [],
    results,
    loading: false,
    error: null,
    search: vi.fn().mockResolvedValue(undefined),
    getCard: vi.fn(),
  };
}

describe("BuscarScreen", () => {
  it("busca al enviar el formulario", async () => {
    const user = userEvent.setup();
    const catalog = fakeCatalog();
    render(<BuscarScreen catalog={catalog} onAddToCollection={vi.fn()} onAddToWishlist={vi.fn()} />);

    await user.type(screen.getByPlaceholderText(/Buscar por nombre/), "charizard");
    await user.click(screen.getByRole("button", { name: "Buscar" }));

    expect(catalog.search).toHaveBeenCalledWith("charizard", undefined);
  });

  it("muestra los resultados de la búsqueda", () => {
    render(
      <BuscarScreen catalog={fakeCatalog([card()])} onAddToCollection={vi.fn()} onAddToWishlist={vi.fn()} />,
    );
    expect(screen.getByText("Charizard")).toBeInTheDocument();
    expect(screen.getByText("120,00 €")).toBeInTheDocument();
  });

  it("abre el detalle al hacer click en una carta y permite añadirla a la colección", async () => {
    const user = userEvent.setup();
    const onAddToCollection = vi.fn().mockResolvedValue(undefined);
    render(
      <BuscarScreen catalog={fakeCatalog([card()])} onAddToCollection={onAddToCollection} onAddToWishlist={vi.fn()} />,
    );

    await user.click(screen.getByRole("button", { name: /Charizard/ }));
    expect(screen.getByRole("heading", { name: "Charizard" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ Añadir a mi colección" }));
    await user.click(screen.getByRole("button", { name: "Añadir a mi colección" }));

    expect(onAddToCollection).toHaveBeenCalledWith(expect.objectContaining({ catalogCardId: "c1" }));
  });

  it("añade una carta a la wishlist con prioridad media por defecto", async () => {
    const user = userEvent.setup();
    const onAddToWishlist = vi.fn().mockResolvedValue(undefined);
    render(
      <BuscarScreen catalog={fakeCatalog([card()])} onAddToCollection={vi.fn()} onAddToWishlist={onAddToWishlist} />,
    );

    await user.click(screen.getByRole("button", { name: /Charizard/ }));
    await user.click(screen.getByRole("button", { name: "+ Añadir a wishlist" }));

    expect(onAddToWishlist).toHaveBeenCalledWith(
      expect.objectContaining({ catalogCardId: "c1", priority: "medium" }),
    );
    expect(await screen.findByText(/añadida a la wishlist/)).toBeInTheDocument();
  });

  it("muestra un mensaje de error si la búsqueda falla", () => {
    render(
      <BuscarScreen
        catalog={{ ...fakeCatalog(), error: "No se ha podido conectar" }}
        onAddToCollection={vi.fn()}
        onAddToWishlist={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("No se ha podido conectar");
  });
});
