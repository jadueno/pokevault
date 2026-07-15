import { describe, expect, it } from "vitest";
import type { PlanSettingsRepository } from "../domain/ports.js";
import type { PlanSettings } from "../domain/types.js";
import { callAsync } from "../test/callAsync.js";
import { createPlanSettingsUseCases } from "./planSettings.js";

function createFakePlanSettingsRepository(initial: PlanSettings): PlanSettingsRepository {
  let current = initial;
  return {
    async get() {
      return current;
    },
    async update(entity: PlanSettings) {
      current = entity;
      return current;
    },
  };
}

function setup() {
  const repo = createFakePlanSettingsRepository({ monthlyBudget: 150, yearRules: null, yearGoal: null });
  return { repo, useCases: createPlanSettingsUseCases(repo) };
}

describe("createPlanSettingsUseCases", () => {
  it("devuelve el presupuesto y las notas actuales", async () => {
    const { useCases } = setup();
    const settings = await useCases.get();
    expect(settings.monthlyBudget).toBe(150);
  });

  it("actualiza el presupuesto y las notas del plan", async () => {
    const { useCases } = setup();
    const updated = await useCases.update({ monthlyBudget: 200, yearRules: "Regla nueva", yearGoal: "Objetivo nuevo" });
    expect(updated.monthlyBudget).toBe(200);
    expect(updated.yearRules).toBe("Regla nueva");
  });

  it("rechaza un presupuesto negativo", async () => {
    const { useCases } = setup();
    await expect(
      callAsync(() => useCases.update({ monthlyBudget: -10, yearRules: null, yearGoal: null })),
    ).rejects.toThrow("no puede ser negativo");
  });
});
