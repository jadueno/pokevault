import type { Pool } from "pg";
import type { NewWishlistItem, WishlistItem, WishlistPriority } from "../../../domain/types.js";
import type { WishlistItemRepository } from "../../../domain/ports.js";

interface WishlistItemRow {
  id: string;
  catalog_card_id: string;
  priority: WishlistPriority;
  max_price: string | null;
  target_month: string | null;
  notes: string | null;
}

const COLUMNS = "id, catalog_card_id, priority, max_price, target_month, notes";

function toWishlistItem(row: WishlistItemRow): WishlistItem {
  return {
    id: row.id,
    catalogCardId: row.catalog_card_id,
    priority: row.priority,
    maxPrice: row.max_price !== null ? Number(row.max_price) : null,
    targetMonth: row.target_month,
    notes: row.notes,
  };
}

export function createWishlistItemRepository(pool: Pool): WishlistItemRepository {
  return {
    async list() {
      const { rows } = await pool.query<WishlistItemRow>(
        `select ${COLUMNS} from wishlist_items order by target_month nulls last, priority desc, created_at desc`,
      );
      return rows.map(toWishlistItem);
    },

    async create(entity: NewWishlistItem) {
      const { rows } = await pool.query<WishlistItemRow>(
        `insert into wishlist_items (catalog_card_id, priority, max_price, target_month, notes)
         values ($1, $2, $3, $4, $5)
         returning ${COLUMNS}`,
        [entity.catalogCardId, entity.priority, entity.maxPrice, entity.targetMonth, entity.notes],
      );
      return toWishlistItem(rows[0]);
    },

    async update(id: string, entity: NewWishlistItem) {
      const { rows } = await pool.query<WishlistItemRow>(
        `update wishlist_items
         set catalog_card_id = $1, priority = $2, max_price = $3, target_month = $4, notes = $5, updated_at = now()
         where id = $6
         returning ${COLUMNS}`,
        [entity.catalogCardId, entity.priority, entity.maxPrice, entity.targetMonth, entity.notes, id],
      );
      return rows[0] ? toWishlistItem(rows[0]) : null;
    },

    async remove(id: string) {
      const { rowCount } = await pool.query("delete from wishlist_items where id = $1", [id]);
      return (rowCount ?? 0) > 0;
    },
  };
}
