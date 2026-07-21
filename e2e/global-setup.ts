import path from "node:path";
import { execSync } from "node:child_process";
import { Client } from "pg";

const TABLES = ["wishlist_items", "collection_items", "sealed_purchases", "plan_items", "set_checklists"];

/** Prepara la base de datos de test antes de la suite E2E: migra y la deja vacía
 * (salvo "plan_settings", singleton sembrado por la propia migración). La búsqueda y
 * sincronización de sets usa el proveedor fake en E2E (forzado en playwright.config.ts
 * con POKEMON_TCG_PROVIDER=fake), determinista sin red. */
export default async function globalSetup() {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    throw new Error("Falta TEST_DATABASE_URL. Los tests E2E nunca deben apuntar a la base de datos real.");
  }
  if (testUrl === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL no puede coincidir con DATABASE_URL: los E2E truncarían datos reales.");
  }

  const backendDir = path.resolve(process.cwd(), "backend");

  execSync("npm run test:migrate", { cwd: backendDir, stdio: "inherit", env: process.env });

  const client = new Client({ connectionString: testUrl });
  await client.connect();
  await client.query(`truncate table ${TABLES.join(", ")} restart identity cascade`);
  await client.end();
}
