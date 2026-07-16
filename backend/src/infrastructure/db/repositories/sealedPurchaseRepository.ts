import type { Pool } from "pg";
import type { NewSealedPurchase, SealedProductType, SealedPurchase } from "../../../domain/types.js";
import type { SealedPurchaseRepository } from "../../../domain/ports.js";

interface SealedPurchaseRow {
  id: string;
  product_name: string;
  product_type: SealedProductType;
  quantity: number;
  purchase_price: string | null;
  purchase_currency: string;
  purchase_date: string | null;
  estimated_value_override: string | null;
  estimated_value_override_at: string | null;
  estimated_value_override_note: string | null;
  location: string | null;
  notes: string | null;
  photo: string | null;
}

const COLUMNS = `id, product_name, product_type, quantity, purchase_price, purchase_currency,
  purchase_date, estimated_value_override, estimated_value_override_at, estimated_value_override_note,
  location, notes, photo`;

function toSealedPurchase(row: SealedPurchaseRow): SealedPurchase {
  return {
    id: row.id,
    productName: row.product_name,
    productType: row.product_type,
    quantity: row.quantity,
    purchasePrice: row.purchase_price !== null ? Number(row.purchase_price) : null,
    purchaseCurrency: row.purchase_currency,
    purchaseDate: row.purchase_date,
    estimatedValueOverride: row.estimated_value_override !== null ? Number(row.estimated_value_override) : null,
    estimatedValueOverrideAt: row.estimated_value_override_at
      ? new Date(row.estimated_value_override_at).toISOString()
      : null,
    estimatedValueOverrideNote: row.estimated_value_override_note,
    location: row.location,
    notes: row.notes,
    photo: row.photo,
  };
}

export function createSealedPurchaseRepository(pool: Pool): SealedPurchaseRepository {
  return {
    async list() {
      const { rows } = await pool.query<SealedPurchaseRow>(`select ${COLUMNS} from sealed_purchases order by created_at desc`);
      return rows.map(toSealedPurchase);
    },

    async create(entity: NewSealedPurchase) {
      const { rows } = await pool.query<SealedPurchaseRow>(
        `insert into sealed_purchases (product_name, product_type, quantity, purchase_price,
           purchase_currency, purchase_date, estimated_value_override, estimated_value_override_at,
           estimated_value_override_note, location, notes, photo)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         returning ${COLUMNS}`,
        [
          entity.productName,
          entity.productType,
          entity.quantity,
          entity.purchasePrice,
          entity.purchaseCurrency,
          entity.purchaseDate,
          entity.estimatedValueOverride,
          entity.estimatedValueOverrideAt,
          entity.estimatedValueOverrideNote,
          entity.location,
          entity.notes,
          entity.photo,
        ],
      );
      return toSealedPurchase(rows[0]);
    },

    async update(id: string, entity: NewSealedPurchase) {
      const { rows } = await pool.query<SealedPurchaseRow>(
        `update sealed_purchases
         set product_name = $1, product_type = $2, quantity = $3, purchase_price = $4,
             purchase_currency = $5, purchase_date = $6, estimated_value_override = $7,
             estimated_value_override_at = $8, estimated_value_override_note = $9, location = $10, notes = $11,
             photo = $12, updated_at = now()
         where id = $13
         returning ${COLUMNS}`,
        [
          entity.productName,
          entity.productType,
          entity.quantity,
          entity.purchasePrice,
          entity.purchaseCurrency,
          entity.purchaseDate,
          entity.estimatedValueOverride,
          entity.estimatedValueOverrideAt,
          entity.estimatedValueOverrideNote,
          entity.location,
          entity.notes,
          entity.photo,
          id,
        ],
      );
      return rows[0] ? toSealedPurchase(rows[0]) : null;
    },

    async remove(id: string) {
      const { rowCount } = await pool.query("delete from sealed_purchases where id = $1", [id]);
      return (rowCount ?? 0) > 0;
    },
  };
}
