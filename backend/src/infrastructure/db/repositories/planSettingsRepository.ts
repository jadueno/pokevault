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

/** Se construye acotado a un usuario concreto (`userId`). Ya no es un singleton global
 * (una única fila para toda la instancia): cada usuario tiene su propia fila, creada la
 * primera vez que la pide (no hay migración-seed posible por usuario, a diferencia del
 * dueño original — ver `1784000000006_seed-plan.ts` — que sí tenía una fila sembrada). */
export function createPlanSettingsRepository(pool: Pool, userId: string): PlanSettingsRepository {
  return {
    async get() {
      const { rows } = await pool.query<PlanSettingsRow>(`select ${COLUMNS} from plan_settings where user_id = $1`, [userId]);
      if (rows[0]) return toPlanSettings(rows[0]);

      const { rows: inserted } = await pool.query<PlanSettingsRow>(
        `insert into plan_settings (user_id, monthly_budget, year_rules, year_goal, shopping_links)
         values ($1, null, null, null, '[]'::jsonb)
         returning ${COLUMNS}`,
        [userId],
      );
      return toPlanSettings(inserted[0]);
    },

    async update(entity: PlanSettings) {
      const { rows } = await pool.query<PlanSettingsRow>(
        `insert into plan_settings (user_id, monthly_budget, year_rules, year_goal, shopping_links)
         values ($1, $2, $3, $4, $5)
         on conflict (user_id) do update
           set monthly_budget = excluded.monthly_budget,
               year_rules = excluded.year_rules,
               year_goal = excluded.year_goal,
               shopping_links = excluded.shopping_links,
               updated_at = now()
         returning ${COLUMNS}`,
        [userId, entity.monthlyBudget, entity.yearRules, entity.yearGoal, JSON.stringify(entity.shoppingLinks)],
      );
      return toPlanSettings(rows[0]);
    },
  };
}
