import type { Pool } from "pg";
import type {
  AcquisitionType,
  CardCondition,
  CardLanguage,
  CollectionItem,
  NewCollectionItem,
} from "../../../domain/types.js";
import type { CollectionItemRepository } from "../../../domain/ports.js";

interface CollectionItemRow {
  id: string;
  catalog_card_id: string;
  language: CardLanguage;
  condition: CardCondition;
  quantity: number;
  acquisition_type: AcquisitionType;
  sealed_purchase_id: string | null;
  purchase_price: string | null;
  purchase_currency: string;
  purchase_date: string | null;
  is_graded: boolean;
  grading_company: string | null;
  grade: string | null;
  estimated_value_override: string | null;
  estimated_value_override_at: string | null;
  estimated_value_override_note: string | null;
  notes: string | null;
}

const COLUMNS = `id, catalog_card_id, language, condition, quantity, acquisition_type, sealed_purchase_id,
  purchase_price, purchase_currency, purchase_date, is_graded, grading_company, grade, estimated_value_override,
  estimated_value_override_at, estimated_value_override_note, notes`;

function toCollectionItem(row: CollectionItemRow): CollectionItem {
  return {
    id: row.id,
    catalogCardId: row.catalog_card_id,
    language: row.language,
    condition: row.condition,
    quantity: row.quantity,
    acquisitionType: row.acquisition_type,
    sealedPurchaseId: row.sealed_purchase_id,
    purchasePrice: row.purchase_price !== null ? Number(row.purchase_price) : null,
    purchaseCurrency: row.purchase_currency,
    purchaseDate: row.purchase_date,
    isGraded: row.is_graded,
    gradingCompany: row.grading_company,
    grade: row.grade !== null ? Number(row.grade) : null,
    estimatedValueOverride: row.estimated_value_override !== null ? Number(row.estimated_value_override) : null,
    estimatedValueOverrideAt: row.estimated_value_override_at
      ? new Date(row.estimated_value_override_at).toISOString()
      : null,
    estimatedValueOverrideNote: row.estimated_value_override_note,
    notes: row.notes,
  };
}

export function createCollectionItemRepository(pool: Pool): CollectionItemRepository {
  return {
    async list() {
      const { rows } = await pool.query<CollectionItemRow>(`select ${COLUMNS} from collection_items order by created_at desc`);
      return rows.map(toCollectionItem);
    },

    async create(entity: NewCollectionItem) {
      const { rows } = await pool.query<CollectionItemRow>(
        `insert into collection_items (catalog_card_id, language, condition, quantity, acquisition_type,
           sealed_purchase_id, purchase_price, purchase_currency, purchase_date, is_graded, grading_company,
           grade, estimated_value_override, estimated_value_override_at, estimated_value_override_note, notes)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         returning ${COLUMNS}`,
        [
          entity.catalogCardId,
          entity.language,
          entity.condition,
          entity.quantity,
          entity.acquisitionType,
          entity.sealedPurchaseId,
          entity.purchasePrice,
          entity.purchaseCurrency,
          entity.purchaseDate,
          entity.isGraded,
          entity.gradingCompany,
          entity.grade,
          entity.estimatedValueOverride,
          entity.estimatedValueOverrideAt,
          entity.estimatedValueOverrideNote,
          entity.notes,
        ],
      );
      return toCollectionItem(rows[0]);
    },

    async update(id: string, entity: NewCollectionItem) {
      const { rows } = await pool.query<CollectionItemRow>(
        `update collection_items
         set catalog_card_id = $1, language = $2, condition = $3, quantity = $4, acquisition_type = $5,
             sealed_purchase_id = $6, purchase_price = $7, purchase_currency = $8, purchase_date = $9,
             is_graded = $10, grading_company = $11, grade = $12, estimated_value_override = $13,
             estimated_value_override_at = $14, estimated_value_override_note = $15, notes = $16, updated_at = now()
         where id = $17
         returning ${COLUMNS}`,
        [
          entity.catalogCardId,
          entity.language,
          entity.condition,
          entity.quantity,
          entity.acquisitionType,
          entity.sealedPurchaseId,
          entity.purchasePrice,
          entity.purchaseCurrency,
          entity.purchaseDate,
          entity.isGraded,
          entity.gradingCompany,
          entity.grade,
          entity.estimatedValueOverride,
          entity.estimatedValueOverrideAt,
          entity.estimatedValueOverrideNote,
          entity.notes,
          id,
        ],
      );
      return rows[0] ? toCollectionItem(rows[0]) : null;
    },

    async remove(id: string) {
      const { rowCount } = await pool.query("delete from collection_items where id = $1", [id]);
      return (rowCount ?? 0) > 0;
    },
  };
}
