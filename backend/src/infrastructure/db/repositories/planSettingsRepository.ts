import type { Pool } from "pg";
import type { PlanSettings } from "../../../domain/types.js";
import type { PlanSettingsRepository } from "../../../domain/ports.js";

interface PlanSettingsRow {
  monthly_budget: string | null;
  year_rules: string | null;
  year_goal: string | null;
}

function toPlanSettings(row: PlanSettingsRow): PlanSettings {
  return {
    monthlyBudget: row.monthly_budget !== null ? Number(row.monthly_budget) : null,
    yearRules: row.year_rules,
    yearGoal: row.year_goal,
  };
}

export function createPlanSettingsRepository(pool: Pool): PlanSettingsRepository {
  return {
    async get() {
      const { rows } = await pool.query<PlanSettingsRow>(
        "select monthly_budget, year_rules, year_goal from plan_settings limit 1",
      );
      if (!rows[0]) {
        throw new Error("No hay fila de plan_settings: falta aplicar las migraciones (npm run migrate:up).");
      }
      return toPlanSettings(rows[0]);
    },

    async update(entity: PlanSettings) {
      const { rows } = await pool.query<PlanSettingsRow>(
        `update plan_settings
         set monthly_budget = $1, year_rules = $2, year_goal = $3, updated_at = now()
         returning monthly_budget, year_rules, year_goal`,
        [entity.monthlyBudget, entity.yearRules, entity.yearGoal],
      );
      return toPlanSettings(rows[0]);
    },
  };
}
