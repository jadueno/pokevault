import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Registro de cada compra de producto sellado (sobres, cajas, ETB...). No hay precio de
 * mercado automático para sellado (el catálogo externo solo da precios de cartas
 * sueltas), así que el valor siempre se estima a mano — mismo patrón de "override" que
 * las cartas de collection_items.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("sealed_purchases", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    product_name: { type: "text", notNull: true },
    catalog_set_id: { type: "uuid", references: "catalog_sets", onDelete: "SET NULL" },
    // 'booster_pack' | 'booster_box' | 'elite_trainer_box' | 'bundle' | 'tin' | 'other'
    product_type: { type: "text", notNull: true },
    quantity: { type: "integer", notNull: true, default: 1 },
    purchase_price: { type: "numeric(10,2)" },
    purchase_currency: { type: "text", notNull: true, default: "EUR" },
    // "text" en vez de "date": ver el comentario en create-catalog.ts (mismo gotcha de
    // desfase de zona horaria). Formato "YYYY-MM-DD".
    purchase_date: { type: "text" },
    estimated_value_override: { type: "numeric(10,2)" },
    estimated_value_override_at: { type: "timestamptz" },
    estimated_value_override_note: { type: "text" },
    location: { type: "text" },
    notes: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("sealed_purchases", "catalog_set_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("sealed_purchases");
}
