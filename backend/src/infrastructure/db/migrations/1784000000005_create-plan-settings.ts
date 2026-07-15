import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/** Tabla singleton: siempre exactamente una fila (creada por la migración de seed que sigue a esta). */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("plan_settings", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    monthly_budget: { type: "numeric(10,2)" },
    // Reglas generales del plan (abrir siempre / guardar siempre / no guardar) — texto libre.
    year_rules: { type: "text" },
    // Objetivo al terminar el plan — texto libre.
    year_goal: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("plan_settings");
}
