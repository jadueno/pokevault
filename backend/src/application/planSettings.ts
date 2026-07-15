import type { PlanSettingsRepository } from "../domain/ports.js";
import type { PlanSettings } from "../domain/types.js";
import { ValidationError } from "./errors.js";

function validate(entity: PlanSettings): void {
  if (entity.monthlyBudget !== null && entity.monthlyBudget < 0) {
    throw new ValidationError("El presupuesto mensual no puede ser negativo");
  }
}

export function createPlanSettingsUseCases(repo: PlanSettingsRepository) {
  return {
    get: () => repo.get(),
    update: (entity: PlanSettings) => {
      validate(entity);
      return repo.update(entity);
    },
  };
}
