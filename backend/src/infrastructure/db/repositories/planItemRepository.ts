import type { Pool } from "pg";
import type { NewPlanItem, PlanCategory, PlanItem } from "../../../domain/types.js";
import type { PlanItemRepository } from "../../../domain/ports.js";

interface PlanItemRow {
  id: string;
  month: string;
  category: PlanCategory;
  description: string;
  reference_price: string | null;
  search_term: string | null;
  done: boolean;
  position: number;
  counted_elsewhere: boolean;
}

const COLUMNS = "id, month, category, description, reference_price, search_term, done, position, counted_elsewhere";

function toPlanItem(row: PlanItemRow): PlanItem {
  return {
    id: row.id,
    month: row.month,
    category: row.category,
    description: row.description,
    referencePrice: row.reference_price !== null ? Number(row.reference_price) : null,
    searchTerm: row.search_term,
    done: row.done,
    position: row.position,
    countedElsewhere: row.counted_elsewhere,
  };
}

/** Se construye acotado a un usuario concreto (`userId`) — ver misma nota en
 * `collectionItemRepository.ts`. */
export function createPlanItemRepository(pool: Pool, userId: string): PlanItemRepository {
  return {
    async list() {
      const { rows } = await pool.query<PlanItemRow>(
        `select ${COLUMNS} from plan_items where user_id = $1 order by month, category, position`,
        [userId],
      );
      return rows.map(toPlanItem);
    },

    async findById(id: string) {
      const { rows } = await pool.query<PlanItemRow>(`select ${COLUMNS} from plan_items where id = $1 and user_id = $2`, [id, userId]);
      return rows[0] ? toPlanItem(rows[0]) : null;
    },

    async create(entity: NewPlanItem) {
      const { rows } = await pool.query<PlanItemRow>(
        `insert into plan_items (user_id, month, category, description, reference_price, search_term, done, position, counted_elsewhere)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         returning ${COLUMNS}`,
        [
          userId,
          entity.month,
          entity.category,
          entity.description,
          entity.referencePrice,
          entity.searchTerm,
          entity.done,
          entity.position,
          entity.countedElsewhere ?? false,
        ],
      );
      return toPlanItem(rows[0]);
    },

    async update(id: string, entity: NewPlanItem) {
      const { rows } = await pool.query<PlanItemRow>(
        `update plan_items
         set month = $1, category = $2, description = $3, reference_price = $4, search_term = $5, done = $6, position = $7,
             counted_elsewhere = $8, updated_at = now()
         where id = $9 and user_id = $10
         returning ${COLUMNS}`,
        [
          entity.month,
          entity.category,
          entity.description,
          entity.referencePrice,
          entity.searchTerm,
          entity.done,
          entity.position,
          entity.countedElsewhere ?? false,
          id,
          userId,
        ],
      );
      return rows[0] ? toPlanItem(rows[0]) : null;
    },

    async remove(id: string) {
      const { rowCount } = await pool.query("delete from plan_items where id = $1 and user_id = $2", [id, userId]);
      return (rowCount ?? 0) > 0;
    },
  };
}
