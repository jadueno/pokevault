import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Cada fila es un ejemplar físico que posee el usuario, no la carta de catálogo en sí
 * (una misma carta puede tener varias filas: distinto idioma, estado, graduación...).
 * Cada alta es una fila nueva — el caso de uso nunca actualiza purchase_price de una
 * fila existente, así no se pisa nunca un precio de compra histórico.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("collection_items", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    catalog_card_id: { type: "uuid", notNull: true, references: "catalog_cards", onDelete: "RESTRICT" },
    // 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ja' | 'ko' | 'zh-cn' | 'zh-tw' | 'id' | 'th'
    language: { type: "text", notNull: true },
    // 'mint' | 'near_mint' | 'excellent' | 'good' | 'light_played' | 'played' | 'poor'
    condition: { type: "text", notNull: true },
    quantity: { type: "integer", notNull: true, default: 1 },
    // 'purchased_single' | 'pulled_from_pack' | 'trade' | 'gift'
    acquisition_type: { type: "text", notNull: true, default: "purchased_single" },
    // Solo tiene sentido si acquisition_type='pulled_from_pack': de qué compra de sobre
    // salió, para no inventar un precio individual que en realidad no existe.
    sealed_purchase_id: { type: "uuid", references: "sealed_purchases", onDelete: "SET NULL" },
    purchase_price: { type: "numeric(10,2)" },
    purchase_currency: { type: "text", notNull: true, default: "EUR" },
    // "text" en vez de "date": ver el comentario en create-catalog.ts (mismo gotcha de
    // desfase de zona horaria). Formato "YYYY-MM-DD".
    purchase_date: { type: "text" },
    is_graded: { type: "boolean", notNull: true, default: false },
    grading_company: { type: "text" },
    grade: { type: "numeric(3,1)" },
    // Corrección manual del valor estimado: queda identificada como tal (fecha + nota),
    // nunca se confunde con el precio que da el catálogo.
    estimated_value_override: { type: "numeric(10,2)" },
    estimated_value_override_at: { type: "timestamptz" },
    estimated_value_override_note: { type: "text" },
    notes: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("collection_items", "catalog_card_id");
  pgm.createIndex("collection_items", "sealed_purchase_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("collection_items");
}
