import { describe, expect, it } from "vitest";
import type { NewPlanItem, PlanItem } from "../domain/types.js";
import { callAsync } from "../test/callAsync.js";
import { createFakeRepository } from "../test/fakeRepository.js";
import { createPlanItemUseCases } from "./planItems.js";

function validItem(overrides: Partial<NewPlanItem> = {}): NewPlanItem {
  return {
    month: "2026-08",
    category: "comprar",
    description: "1x ETB Megaevolución - Oscuridad Absoluta (ES)",
    referencePrice: null,
    searchTerm: null,
    done: false,
    position: 0,
    ...overrides,
  };
}

function setup() {
  const repo = createFakeRepository<PlanItem, NewPlanItem>();
  return { repo, useCases: createPlanItemUseCases(repo) };
}

describe("createPlanItemUseCases", () => {
  it("añade un ítem válido", async () => {
    const { useCases } = setup();
    const created = await useCases.create(validItem());
    expect(created.month).toBe("2026-08");
    expect(created.done).toBe(false);
  });

  it("rechaza un mes con formato incorrecto", async () => {
    const { useCases } = setup();
    await expect(callAsync(() => useCases.create(validItem({ month: "agosto-2026" })))).rejects.toThrow(
      "formato AAAA-MM",
    );
  });

  it("rechaza una categoría no reconocida", async () => {
    const { useCases } = setup();
    await expect(
      callAsync(() => useCases.create(validItem({ category: "vender" as never }))),
    ).rejects.toThrow("La categoría debe ser una de");
  });

  it("rechaza una descripción vacía", async () => {
    const { useCases } = setup();
    await expect(callAsync(() => useCases.create(validItem({ description: "  " })))).rejects.toThrow(
      "no puede estar vacío",
    );
  });

  it("rechaza un precio de referencia negativo", async () => {
    const { useCases } = setup();
    await expect(callAsync(() => useCases.create(validItem({ referencePrice: -5 })))).rejects.toThrow(
      "no puede ser negativo",
    );
  });

  it("admite un ítem con precio de referencia y término de búsqueda", async () => {
    const { useCases } = setup();
    const created = await useCases.create(validItem({ referencePrice: 59, searchTerm: "ETB Oscuridad Absoluta Español" }));
    expect(created.referencePrice).toBe(59);
    expect(created.searchTerm).toBe("ETB Oscuridad Absoluta Español");
  });

  it("toggleDone marca como hecho un ítem sin tocar el resto de campos", async () => {
    const { useCases } = setup();
    const created = await useCases.create(validItem());
    const toggled = await useCases.toggleDone(created.id);
    expect(toggled?.done).toBe(true);
    expect(toggled?.description).toBe(created.description);

    const toggledBack = await useCases.toggleDone(created.id);
    expect(toggledBack?.done).toBe(false);
  });

  it("toggleDone falla si el ítem no existe", async () => {
    const { useCases } = setup();
    await expect(callAsync(() => useCases.toggleDone("no-existe"))).rejects.toThrow("No existe ese ítem del plan");
  });
});
