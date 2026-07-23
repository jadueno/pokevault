import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/** Distingue variante de impresión (normal / reverso-foil / holo) de una misma carta —
 * algunas cartas de un set vienen en ambas versiones, cada una con su propio precio de
 * Cardmarket. NOT NULL con default 'normal': todo lo que ya existía antes de este
 * concepto (checklists sincronizados, colección real) se asume la versión normal, que es
 * la inmensa mayoría de los casos reales. Un checklist ya sincronizado no gana filas de
 * variante nuevas solo. */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn("set_checklist_cards", { variant: { type: "text", notNull: true, default: "normal" } });
  pgm.addColumn("collection_items", { variant: { type: "text", notNull: true, default: "normal" } });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn("collection_items", "variant");
  pgm.dropColumn("set_checklist_cards", "variant");
}
