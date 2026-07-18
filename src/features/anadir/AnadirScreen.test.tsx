import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../../components/ConfirmProvider";
import type { CollectionItem, SealedPurchase } from "../../domain/types";
import { AnadirScreen } from "./AnadirScreen";
import * as api from "../../data/api";

vi.mock("../../data/imageCapture", () => ({
  compressImage: vi.fn().mockResolvedValue("data:image/jpeg;base64,AAAA"),
}));

function sealedPurchase(overrides: Partial<SealedPurchase> = {}): SealedPurchase {
  return {
    id: "sp1",
    productName: "ETB Oscuridad Absoluta",
    productType: "elite_trainer_box",
    quantity: 1,
    purchasePrice: 60,
    purchaseCurrency: "EUR",
    purchaseDate: "2026-08-12",
    estimatedValueOverride: null,
    estimatedValueOverrideAt: null,
    estimatedValueOverrideNote: null,
    location: null,
    notes: null,
    photo: null,
    ...overrides,
  };
}

function renderScreen(options: { sealedItems?: SealedPurchase[]; collectionItems?: CollectionItem[] } = {}) {
  const handlers = {
    onAddToCollection: vi.fn().mockResolvedValue(undefined),
    onAddToWishlist: vi.fn().mockResolvedValue(undefined),
    onAddToSealed: vi.fn().mockResolvedValue(undefined),
  };
  render(
    <ConfirmProvider>
      <AnadirScreen sealedItems={options.sealedItems ?? []} collectionItems={options.collectionItems ?? []} {...handlers} />
    </ConfirmProvider>,
  );
  return handlers;
}

async function takePhoto(user: ReturnType<typeof userEvent.setup>) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File(["foto"], "carta.jpg", { type: "image/jpeg" });
  await user.upload(input, file);
}

describe("AnadirScreen", () => {
  it("tras hacer una foto, muestra los datos reconocidos y permite elegir destino", async () => {
    vi.spyOn(api, "recognizeCard").mockResolvedValue({
      name: "Charizard",
      setName: "Base",
      number: "4/102",
      rarity: "Rare Holo",
      confidence: "high",
    });
    const user = userEvent.setup();
    renderScreen();

    await takePhoto(user);

    expect(await screen.findByText("Charizard")).toBeInTheDocument();
    expect(screen.getByText("Base")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ A mi colección" })).toBeInTheDocument();
  });

  it("añade a la colección con los datos reconocidos precargados", async () => {
    vi.spyOn(api, "recognizeCard").mockResolvedValue({
      name: "Charizard",
      setName: "Base",
      number: "4/102",
      rarity: "Rare Holo",
      confidence: "high",
    });
    const user = userEvent.setup();
    const handlers = renderScreen();

    await takePhoto(user);
    await user.click(await screen.findByRole("button", { name: "+ A mi colección" }));

    expect(screen.getByDisplayValue("Charizard")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Añadir a mi colección" }));

    expect(handlers.onAddToCollection).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Charizard", setName: "Base", number: "4/102", rarity: "Rare Holo" }),
    );
  });

  it("si no se reconoce nada, avisa y deja rellenar a mano", async () => {
    vi.spyOn(api, "recognizeCard").mockResolvedValue({ name: null, setName: null, number: null, rarity: null, confidence: null });
    const user = userEvent.setup();
    renderScreen();

    await takePhoto(user);

    expect(await screen.findByText(/No se ha podido identificar nada en la foto/)).toBeInTheDocument();
  });

  it("si falla el reconocimiento, avisa sin romper el flujo", async () => {
    vi.spyOn(api, "recognizeCard").mockRejectedValue(new Error("Ollama no responde"));
    const user = userEvent.setup();
    renderScreen();

    await takePhoto(user);

    expect(await screen.findByText(/No se ha podido identificar automáticamente/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ A mi colección" })).toBeInTheDocument();
  });

  it("vincula la carta a un sobre y guarda con sealedPurchaseId", async () => {
    vi.spyOn(api, "recognizeCard").mockResolvedValue({
      name: "Eevee",
      setName: "Jungla",
      number: null,
      rarity: null,
      confidence: "high",
    });
    const user = userEvent.setup();
    const handlers = renderScreen({ sealedItems: [sealedPurchase()] });

    await takePhoto(user);
    await user.click(await screen.findByRole("button", { name: "+ A mi colección" }));
    await user.selectOptions(screen.getByLabelText("¿Cómo la conseguiste?"), "pulled_from_pack");
    await user.selectOptions(screen.getByLabelText("¿De qué sobre?"), "sp1");
    await user.click(screen.getByRole("button", { name: "Añadir a mi colección" }));

    expect(handlers.onAddToCollection).toHaveBeenCalledWith(expect.objectContaining({ sealedPurchaseId: "sp1" }));
  });

  it("tras guardar una carta de un sobre, la siguiente foto salta directa al formulario con el sobre ya elegido", async () => {
    vi.spyOn(api, "recognizeCard").mockResolvedValue({
      name: "Eevee",
      setName: "Jungla",
      number: null,
      rarity: null,
      confidence: "high",
    });
    const user = userEvent.setup();
    renderScreen({ sealedItems: [sealedPurchase()] });

    await takePhoto(user);
    await user.click(await screen.findByRole("button", { name: "+ A mi colección" }));
    await user.selectOptions(screen.getByLabelText("¿Cómo la conseguiste?"), "pulled_from_pack");
    await user.selectOptions(screen.getByLabelText("¿De qué sobre?"), "sp1");
    await user.click(screen.getByRole("button", { name: "Añadir a mi colección" }));

    expect(await screen.findByText("Añadiendo cartas de")).toBeInTheDocument();

    await takePhoto(user);

    // Ya no hace falta pulsar "+ A mi colección": salta directo al formulario.
    expect(await screen.findByLabelText("¿De qué sobre?")).toHaveValue("sp1");
  });
});
