import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/** Páginas/tiendas donde el usuario suele comprar, editables desde la propia pantalla
 * del plan (no solo desde "Ajustes"). [{label, url}], mismo patrón que portfolio_links en faro. */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn("plan_settings", {
    shopping_links: { type: "jsonb", notNull: true, default: "[]" },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn("plan_settings", "shopping_links");
}
