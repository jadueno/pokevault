import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

const SCOPED_TABLES = ["sealed_purchases", "collection_items", "wishlist_items", "plan_items", "plan_settings", "set_checklists"];

/**
 * Paso 2 de 2 de la migración multi-usuario (ver 1784000000017 y backfillOwnerUser.ts
 * para el resto del contexto): exige que ese script ya se haya ejecutado en este entorno.
 * Si quedara alguna fila con `user_id` nulo, el `ALTER ... SET NOT NULL` falla aquí solo,
 * sin corromper nada — es la red de seguridad, no hace falta comprobarlo a mano antes
 * (aunque se recomienda: `select count(*) from <tabla> where user_id is null`).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  for (const table of SCOPED_TABLES) {
    pgm.alterColumn(table, "user_id", { notNull: true });
  }

  // Antes: un set/binder real solo se podía sincronizar UNA VEZ en toda la instancia.
  // Ahora: cada usuario lo sincroniza de forma independiente, sin chocar con los demás.
  pgm.dropConstraint("set_checklists", "set_checklists_external_set_id_key");
  pgm.addConstraint("set_checklists", "set_checklists_user_id_external_set_id_key", {
    unique: ["user_id", "external_set_id"],
  });

  // plan_settings deja de ser un singleton global (una única fila para toda la instancia):
  // pasa a ser una fila por usuario.
  pgm.addConstraint("plan_settings", "plan_settings_user_id_key", { unique: ["user_id"] });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropConstraint("plan_settings", "plan_settings_user_id_key");
  pgm.dropConstraint("set_checklists", "set_checklists_user_id_external_set_id_key");
  pgm.addConstraint("set_checklists", "set_checklists_external_set_id_key", { unique: ["external_set_id"] });

  for (const table of SCOPED_TABLES) {
    pgm.alterColumn(table, "user_id", { notNull: false });
  }
}
