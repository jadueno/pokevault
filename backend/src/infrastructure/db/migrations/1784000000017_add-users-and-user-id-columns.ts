import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

const SCOPED_TABLES = ["sealed_purchases", "collection_items", "wishlist_items", "plan_items", "plan_settings", "set_checklists"];

/**
 * Paso 1 de 2 de la migración multi-usuario (ver backfillOwnerUser.ts para el paso
 * intermedio, y la migración 1784000000018 para el paso 2). `user_id` nullable a
 * propósito: sin backfill aquí, así el código viejo (aún sin desplegar la versión
 * multi-usuario) sigue funcionando sin tocar mientras se aplica esto, sin downtime.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("users", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    email: { type: "text", notNull: true, unique: true },
    password_hash: { type: "text", notNull: true },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  for (const table of SCOPED_TABLES) {
    pgm.addColumn(table, {
      user_id: { type: "uuid", references: "users", onDelete: "CASCADE" },
    });
    pgm.createIndex(table, "user_id");
  }
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  for (const table of SCOPED_TABLES) {
    pgm.dropColumn(table, ["user_id"]);
  }
  pgm.dropTable("users");
}
