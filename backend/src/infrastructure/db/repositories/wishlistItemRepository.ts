import type { Pool } from "pg";
import type { NewWishlistItem, WishlistItem, WishlistPriority } from "../../../domain/types.js";
import type { WishlistItemRepository } from "../../../domain/ports.js";

interface WishlistItemRow {
  id: string;
  name: string;
  set_name: string | null;
  priority: WishlistPriority;
  max_price: string | null;
  target_month: string | null;
  notes: string | null;
  photo: string | null;
}

const COLUMNS = "id, name, set_name, priority, max_price, target_month, notes, photo";

function toWishlistItem(row: WishlistItemRow): WishlistItem {
  return {
    id: row.id,
    name: row.name,
    setName: row.set_name,
    priority: row.priority,
    maxPrice: row.max_price !== null ? Number(row.max_price) : null,
    targetMonth: row.target_month,
    notes: row.notes,
    photo: row.photo,
  };
}

/** Se construye acotado a un usuario concreto (`userId`) — ver misma nota en
 * `collectionItemRepository.ts`. */
export function createWishlistItemRepository(pool: Pool, userId: string): WishlistItemRepository {
  return {
    async list() {
      const { rows } = await pool.query<WishlistItemRow>(
        `select ${COLUMNS} from wishlist_items where user_id = $1 order by target_month nulls last, priority desc, created_at desc`,
        [userId],
      );
      return rows.map(toWishlistItem);
    },

    async findById(id: string) {
      const { rows } = await pool.query<WishlistItemRow>(
        `select ${COLUMNS} from wishlist_items where id = $1 and user_id = $2`,
        [id, userId],
      );
      return rows[0] ? toWishlistItem(rows[0]) : null;
    },

    async create(entity: NewWishlistItem) {
      const { rows } = await pool.query<WishlistItemRow>(
        `insert into wishlist_items (user_id, name, set_name, priority, max_price, target_month, notes, photo)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning ${COLUMNS}`,
        [userId, entity.name, entity.setName, entity.priority, entity.maxPrice, entity.targetMonth, entity.notes, entity.photo],
      );
      return toWishlistItem(rows[0]);
    },

    async update(id: string, entity: NewWishlistItem) {
      const { rows } = await pool.query<WishlistItemRow>(
        `update wishlist_items
         set name = $1, set_name = $2, priority = $3, max_price = $4, target_month = $5, notes = $6, photo = $7,
             updated_at = now()
         where id = $8 and user_id = $9
         returning ${COLUMNS}`,
        [entity.name, entity.setName, entity.priority, entity.maxPrice, entity.targetMonth, entity.notes, entity.photo, id, userId],
      );
      return rows[0] ? toWishlistItem(rows[0]) : null;
    },

    async remove(id: string) {
      const { rowCount } = await pool.query("delete from wishlist_items where id = $1 and user_id = $2", [id, userId]);
      return (rowCount ?? 0) > 0;
    },
  };
}
