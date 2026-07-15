import type { Pool } from "pg";
import type { PlanSettings, ShoppingLink } from "../../../domain/types.js";
import type { PlanSettingsRepository } from "../../../domain/ports.js";

interface PlanSettingsRow {
  monthly_budget: string | null;
  year_rules: string | null;
  year_goal: string | null;
  shopping_links: ShoppingLink[];
}

function toPlanSettings(row: PlanSettingsRow): PlanSettings {
  return {
    monthlyBudget: row.monthly_budget !== null ? Number(row.monthly_budget) : null,
    yearRules: row.year_rules,
    yearGoal: row.year_goal,
    shoppingLinks: row.shopping_links,
  };
}

const COLUMNS = "monthly_budget, year_rules, year_goal, shopping_links";

export function createPlanSettingsRepository(pool: Pool): PlanSettingsRepository {
  return {
    async get() {
      const { rows } = await pool.query<PlanSettingsRow>(`select ${COLUMNS} from plan_settings limit 1`);
      if (!rows[0]) {
        throw new Error("No hay fila de plan_settings: falta aplicar las migraciones (npm run migrate:up).");
      }
      return toPlanSettings(rows[0]);
    },

    async update(entity: PlanSettings) {
      const { rows } = await pool.query<PlanSettingsRow>(
        `update plan_settings
         set monthly_budget = $1, year_rules = $2, year_goal = $3, shopping_links = $4, updated_at = now()
         returning ${COLUMNS}`,
        [entity.monthlyBudget, entity.yearRules, entity.yearGoal, JSON.stringify(entity.shoppingLinks)],
      );
      return toPlanSettings(rows[0]);
    },
  };
}
