import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Se elimina la categoría "abrir" del plan: en la práctica nunca se usó como paso
 * distinto de "comprar" (abrir un sobre/caja ya comprado no es una acción de compra
 * propia), así que se pliega en "comprar". Los ítems existentes con category='abrir'
 * se reasignan antes de estrechar el check constraint, para no perderlos.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  await pgm.db.query("update plan_items set category = 'comprar' where category = 'abrir'");
  pgm.dropConstraint("plan_items", "plan_items_category_check");
  pgm.addConstraint("plan_items", "plan_items_category_check", {
    check: "category in ('comprar', 'guardar_sellado')",
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint("plan_items", "plan_items_category_check");
  pgm.addConstraint("plan_items", "plan_items_category_check", {
    check: "category in ('comprar', 'abrir', 'guardar_sellado')",
  });
}
