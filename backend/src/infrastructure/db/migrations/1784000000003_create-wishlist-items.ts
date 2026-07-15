import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * "target_month" es el objetivo de compra mensual pedido por el usuario ("en agosto
 * quiero esto, en septiembre esto otro"): agrupar/filtrar la propia wishlist por mes
 * da esa pantalla directamente, sin necesitar una tabla nueva de planificación.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("wishlist_items", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    catalog_card_id: { type: "uuid", notNull: true, references: "catalog_cards", onDelete: "CASCADE" },
    // 'low' | 'medium' | 'high'
    priority: { type: "text", notNull: true, default: "medium" },
    max_price: { type: "numeric(10,2)" },
    // Formato "YYYY-MM", nullable (no todo objetivo de wishlist tiene mes asignado).
    target_month: { type: "text" },
    notes: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.addConstraint("wishlist_items", "wishlist_items_catalog_card_id_key", { unique: ["catalog_card_id"] });
  pgm.createIndex("wishlist_items", "target_month");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("wishlist_items");
}
