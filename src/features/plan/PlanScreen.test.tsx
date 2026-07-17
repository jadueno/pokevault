import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmProvider } from "../../components/ConfirmProvider";
import type { PlanItem, PlanSettings } from "../../domain/types";
import { PlanScreen } from "./PlanScreen";

function item(overrides: Partial<PlanItem> = {}): PlanItem {
  return {
    id: "p1",
    month: "2026-08",
    category: "comprar",
    description: "1x ETB Megaevolución - Oscuridad Absoluta (ES)",
    done: false,
    position: 0,
    ...overrides,
  };
}

function planSettings(overrides: Partial<PlanSettings> = {}): PlanSettings {
  return {
    monthlyBudget: 150,
    yearRules: "Regla de ejemplo",
    yearGoal: "Objetivo de ejemplo",
    shoppingLinks: [],
    ...overrides,
  };
}

function renderScreen(items: PlanItem[], settings: PlanSettings = planSettings()) {
  const handlers = {
    onAdd: vi.fn().mockResolvedValue(undefined),
    onUpdate: vi.fn().mockResolvedValue(undefined),
    onRemove: vi.fn().mockResolvedValue(undefined),
    onToggleDone: vi.fn().mockResolvedValue(undefined),
    onUpdateSettings: vi.fn().mockResolvedValue(undefined),
  };
  render(
    <ConfirmProvider>
      <PlanScreen items={items} settings={settings} {...handlers} />
    </ConfirmProvider>,
  );
  return handlers;
}

describe("PlanScreen", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("agrupa por mes y muestra el presupuesto", () => {
    renderScreen([item()]);
    expect(screen.getByText("Agosto de 2026")).toBeInTheDocument();
    expect(screen.getByText("1x ETB Megaevolución - Oscuridad Absoluta (ES)")).toBeInTheDocument();
    expect(screen.getByText("150,00 €")).toBeInTheDocument();
  });

  it("marcar como hecho llama a onToggleDone y no toca la colección", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()]);

    await user.click(screen.getByRole("checkbox", { name: /Marcar/ }));

    expect(handlers.onToggleDone).toHaveBeenCalledWith("p1");
    expect(handlers.onUpdate).not.toHaveBeenCalled();
  });

  it("un ítem hecho se muestra tachado", () => {
    renderScreen([item({ done: true })]);
    const text = screen.getByText("1x ETB Megaevolución - Oscuridad Absoluta (ES)");
    expect(text.className).toContain("line-through");
  });

  it("editar la descripción inline llama a onUpdate", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()]);

    await user.click(screen.getByText("1x ETB Megaevolución - Oscuridad Absoluta (ES)"));
    const input = screen.getByDisplayValue("1x ETB Megaevolución - Oscuridad Absoluta (ES)");
    await user.clear(input);
    await user.type(input, "1x ETB nueva{Enter}");

    expect(handlers.onUpdate).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ description: "1x ETB nueva" }),
    );
  });

  it("añadir un ítem nuevo en una categoría llama a onAdd con mes y categoría correctos", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()]);

    const abrirInputs = screen.getAllByPlaceholderText("Añadir ítem…");
    // comprar, abrir, guardar_sellado en ese orden dentro del mes agosto.
    await user.type(abrirInputs[1], "Nuevo ítem para abrir");
    await user.click(screen.getAllByRole("button", { name: "+ Añadir" })[1]);

    expect(handlers.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ month: "2026-08", category: "abrir", description: "Nuevo ítem para abrir" }),
    );
  });

  it("copia la descripción del ítem al portapapeles", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    renderScreen([item()]);

    await user.click(screen.getByRole("button", { name: 'Copiar "1x ETB Megaevolución - Oscuridad Absoluta (ES)"' }));

    expect(writeText).toHaveBeenCalledWith("1x ETB Megaevolución - Oscuridad Absoluta (ES)");
  });

  it("sin ítems, muestra el aviso correspondiente", () => {
    renderScreen([]);
    expect(screen.getByText(/Todavía no hay ítems en el plan\./)).toBeInTheDocument();
  });

  it("abre los ajustes del plan y los guarda", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()]);

    await user.click(screen.getByRole("button", { name: "Ajustes del plan" }));
    const budgetInput = screen.getByLabelText("Presupuesto mensual (€)");
    await user.clear(budgetInput);
    await user.type(budgetInput, "200");
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(handlers.onUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({ monthlyBudget: 200 }));
  });

  it("añade una página de compra desde la caja de arriba", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()]);

    await user.type(screen.getByPlaceholderText("Nombre, p. ej. Cardmarket"), "Cardmarket");
    await user.type(screen.getByPlaceholderText("https://..."), "https://www.cardmarket.com");
    await user.click(screen.getByRole("button", { name: "+ Añadir página" }));

    expect(handlers.onUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ shoppingLinks: [{ label: "Cardmarket", url: "https://www.cardmarket.com" }] }),
    );
  });

  it("muestra las páginas de compra ya guardadas como enlaces", () => {
    renderScreen([item()], planSettings({ shoppingLinks: [{ label: "Cardmarket", url: "https://www.cardmarket.com" }] }));
    const link = screen.getByRole("link", { name: "Cardmarket" });
    expect(link).toHaveAttribute("href", "https://www.cardmarket.com");
  });

  it("quita una página de compra existente", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen(
      [item()],
      planSettings({ shoppingLinks: [{ label: "Cardmarket", url: "https://www.cardmarket.com" }] }),
    );

    await user.click(screen.getByRole("button", { name: "Quitar Cardmarket de las páginas de compra" }));
    await user.click(screen.getByRole("button", { name: "Eliminar" }));

    expect(handlers.onUpdateSettings).toHaveBeenCalledWith(expect.objectContaining({ shoppingLinks: [] }));
  });
});
