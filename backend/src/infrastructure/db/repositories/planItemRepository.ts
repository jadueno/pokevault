import type { Pool } from "pg";
import type { NewPlanItem, PlanCategory, PlanItem } from "../../../domain/types.js";
import type { PlanItemRepository } from "../../../domain/ports.js";

interface PlanItemRow {
  id: string;
  month: string;
  category: PlanCategory;
  description: string;
  done: boolean;
  position: number;
}

const COLUMNS = "id, month, category, description, done, position";

function toPlanItem(row: PlanItemRow): PlanItem {
  return {
    id: row.id,
    month: row.month,
    category: row.category,
    description: row.description,
    done: row.done,
    position: row.position,
  };
}

export function createPlanItemRepository(pool: Pool): PlanItemRepository {
  return {
    async list() {
      const { rows } = await pool.query<PlanItemRow>(
        `select ${COLUMNS} from plan_items order by month, category, position`,
      );
      return rows.map(toPlanItem);
    },

    async create(entity: NewPlanItem) {
      const { rows } = await pool.query<PlanItemRow>(
        `insert into plan_items (month, category, description, done, position)
         values ($1, $2, $3, $4, $5)
         returning ${COLUMNS}`,
        [entity.month, entity.category, entity.description, entity.done, entity.position],
      );
      return toPlanItem(rows[0]);
    },

    async update(id: string, entity: NewPlanItem) {
      const { rows } = await pool.query<PlanItemRow>(
        `update plan_items
         set month = $1, category = $2, description = $3, done = $4, position = $5, updated_at = now()
         where id = $6
         returning ${COLUMNS}`,
        [entity.month, entity.category, entity.description, entity.done, entity.position, id],
      );
      return rows[0] ? toPlanItem(rows[0]) : null;
    },

    async remove(id: string) {
      const { rowCount } = await pool.query("delete from plan_items where id = $1", [id]);
      return (rowCount ?? 0) > 0;
    },
  };
}
