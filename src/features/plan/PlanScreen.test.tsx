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
    referencePrice: null,
    searchTerm: null,
    done: false,
    position: 0,
    countedElsewhere: false,
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

  it("un mes con todos los ítems hechos empieza cerrado, y se puede reabrir con un clic", async () => {
    const user = userEvent.setup();
    renderScreen([item({ done: true })]);

    const details = screen.getByText("Agosto de 2026").closest("details");
    expect(details).not.toHaveAttribute("open");

    await user.click(screen.getByText("Agosto de 2026"));
    expect(details).toHaveAttribute("open");
  });

  it("un mes con ítems pendientes empieza abierto", () => {
    renderScreen([item({ done: false })]);
    const details = screen.getByText("Agosto de 2026").closest("details");
    expect(details).toHaveAttribute("open");
  });

  it("edita el ítem completo desde el modal y llama a onUpdate", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()]);

    await user.click(screen.getByRole("button", { name: 'Editar "1x ETB Megaevolución - Oscuridad Absoluta (ES)"' }));
    const textarea = screen.getByDisplayValue("1x ETB Megaevolución - Oscuridad Absoluta (ES)");
    await user.clear(textarea);
    await user.type(textarea, "1x ETB nueva");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(handlers.onUpdate).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ description: "1x ETB nueva" }),
    );
  });

  it("añadir un ítem nuevo en una categoría que ya tiene ítems llama a onAdd con mes y categoría correctos", async () => {
    const user = userEvent.setup();
    // Solo "comprar" tiene ítems: es la única categoría con la columna siempre visible
    // (la categoría vacía del mes, "guardar_sellado", queda como chip "+ …").
    const handlers = renderScreen([item()]);

    const input = screen.getByPlaceholderText("Añadir ítem…");
    await user.type(input, "Nuevo ítem para comprar");
    await user.click(screen.getByRole("button", { name: "+ Añadir" }));

    expect(handlers.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ month: "2026-08", category: "comprar", description: "Nuevo ítem para comprar" }),
    );
  });

  it("una categoría del mes sin ítems se muestra como chip y revela el formulario al pulsarlo", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen([item()]); // solo "comprar" tiene ítems

    // Antes de pulsar el chip no hay ningún formulario de "guardar_sellado" visible.
    expect(screen.getAllByPlaceholderText("Añadir ítem…")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Añadir ítem a Guardar sellado" }));
    const inputs = screen.getAllByPlaceholderText("Añadir ítem…");
    expect(inputs).toHaveLength(2);
    await user.type(inputs[1], "Nuevo ítem para guardar sellado");
    await user.click(screen.getAllByRole("button", { name: "+ Añadir" })[1]);

    expect(handlers.onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ month: "2026-08", category: "guardar_sellado", description: "Nuevo ítem para guardar sellado" }),
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

  it("si el ítem tiene un término de búsqueda, copia solo eso en vez de la frase completa", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    renderScreen([
      item({
        description: "1x Booster Bundle Oscuridad Absoluta (ES)",
        referencePrice: 35,
        searchTerm: "Caja 6 Sobres Oscuridad Absoluta Español",
      }),
    ]);

    await user.click(screen.getByRole("button", { name: 'Copiar "Caja 6 Sobres Oscuridad Absoluta Español"' }));

    expect(writeText).toHaveBeenCalledWith("Caja 6 Sobres Oscuridad Absoluta Español");
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

  it("muestra la nota de una página de compra si existe", () => {
    renderScreen(
      [item()],
      planSettings({
        shoppingLinks: [
          { label: "Cardmarket", url: "https://www.cardmarket.com", note: "Cartas sueltas — mira el Trend Price." },
        ],
      }),
    );
    expect(screen.getByText("Cartas sueltas — mira el Trend Price.")).toBeInTheDocument();
  });

  it("destaca tipográficamente el precio de referencia", () => {
    renderScreen([item({ description: "1x ETB — lanzamiento 16 sept.", referencePrice: 59 })]);
    const priceSpan = screen.getByText("(ref. 59,00 €)");
    expect(priceSpan.className).toContain("text-[var(--amber)]");
  });

  it("muestra el total gastado del mes cuando hay ítems con precio de referencia", () => {
    renderScreen([item({ referencePrice: 59 })]);
    expect(screen.getByText(/Total/)).toBeInTheDocument();
    expect(screen.getByText("59,00 €")).toBeInTheDocument();
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

  it("edita una página de compra existente sin borrarla y volverla a crear", async () => {
    const user = userEvent.setup();
    const handlers = renderScreen(
      [item()],
      planSettings({ shoppingLinks: [{ label: "Cardmarket", url: "https://www.cardmarket.com" }] }),
    );

    await user.click(screen.getByRole("button", { name: "Editar Cardmarket" }));
    const urlInput = screen.getByDisplayValue("https://www.cardmarket.com");
    await user.clear(urlInput);
    await user.type(urlInput, "https://www.cardmarket.com/es");
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    expect(handlers.onUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({ shoppingLinks: [{ label: "Cardmarket", url: "https://www.cardmarket.com/es" }] }),
    );
  });

  it("cancelar la edición de una página de compra no envía cambios", async () => {
    const user = userEvent.setup();
    renderScreen([item()], planSettings({ shoppingLinks: [{ label: "Cardmarket", url: "https://www.cardmarket.com" }] }));

    await user.click(screen.getByRole("button", { name: "Editar Cardmarket" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.getByRole("button", { name: "+ Añadir página" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Nombre, p. ej. Cardmarket")).toHaveValue("");
  });
});
