import { execSync } from "node:child_process";

/**
 * `npm run test:migrate`: aplica todas las migraciones a `TEST_DATABASE_URL` (usado por
 * los tests de integración del backend, por E2E y por CI). Hace falta en 3 pasos, no uno
 * solo, por la migración multi-usuario (1784000000017/1784000000018, ver ARCHITECTURE.md):
 * una base de datos de test recién creada desde cero YA tiene filas reales en `plan_items`
 * (sembradas por la migración antigua `1784000000006_seed-plan.ts`, igual en todos los
 * entornos) antes de que exista ningún usuario — sin un backfill entre medias, la
 * migración que exige `user_id NOT NULL` fallaría siempre en una base de datos nueva.
 *
 * 1. Migra hasta (e incluida) 1784000000017 — añade `users` + `user_id` NULLABLE.
 * 2. `backfillOwnerUser.ts` crea un usuario de arranque fijo (solo para tests, nunca
 *    credenciales reales) y le asigna las filas ya sembradas.
 * 3. Migra el resto (1784000000018) — ya no hay ninguna fila con `user_id` nulo.
 */
const MIGRATE_BASE = "node-pg-migrate --tsx --migrations-dir src/infrastructure/db/migrations --migration-file-language ts -d TEST_DATABASE_URL";

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
if (!testDatabaseUrl) {
  console.error("Falta TEST_DATABASE_URL en el entorno.");
  process.exit(1);
}

function run(command: string, extraEnv: Record<string, string> = {}): void {
  execSync(command, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
}

run(`${MIGRATE_BASE} up 1784000000017 --timestamp`);
run("tsx src/scripts/backfillOwnerUser.ts", {
  DATABASE_URL: testDatabaseUrl,
  LOGIN_USERNAME: "ci-bootstrap@example.com",
  // Hash real de una contraseña de prueba fija, sin relación con ninguna cuenta real —
  // esta base de datos es siempre efímera (test/CI/E2E), nunca producción.
  LOGIN_PASSWORD_HASH:
    "3a253b1d44fd3d5f5ad05b5d82dc12c9:950fe045140bf59e1b9c17fa8676e0797167d0bff27fee123c5b1c7ae6e1ce83bb7583a75600decef587d4d852b35ef6d8c74849be726ec2c71e9fae06997ec4",
});
run(`${MIGRATE_BASE} up`);
