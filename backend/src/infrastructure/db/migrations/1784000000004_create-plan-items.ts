import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * El plan de compra mensual real del usuario mezcla accesorios, cantidades por rareza,
 * cartas concretas con varias opciones y producto sellado — no encaja en wishlist_items
 * (que exige una carta de catálogo concreta vía catalog_card_id). Por eso es una lista de
 * tareas de texto libre por mes, con un "hecho" independiente de "Ya la tengo": no pasa
 * por el alta en colección (idioma/estado/precio) ni cuenta en valor/invertido.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("plan_items", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    // Formato "YYYY-MM".
    month: { type: "text", notNull: true },
    // 'comprar' | 'abrir' | 'guardar_sellado'
    category: { type: "text", notNull: true },
    description: { type: "text", notNull: true },
    done: { type: "boolean", notNull: true, default: false },
    position: { type: "integer", notNull: true, default: 0 },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.addConstraint("plan_items", "plan_items_category_check", {
    check: "category in ('comprar', 'abrir', 'guardar_sellado')",
  });
  pgm.createIndex("plan_items", "month");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("plan_items");
}
