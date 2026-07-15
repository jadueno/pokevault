import { execSync } from "node:child_process";
import path from "node:path";
import { Client } from "pg";

const TABLES = ["wishlist_items", "collection_items", "sealed_purchases", "catalog_sync_log", "catalog_cards", "catalog_sets"];

/**
 * Prepara la base de datos de test antes de la suite E2E: migra, la deja vacía, y
 * siembra el catálogo con el proveedor fake (determinista, sin red, incluye
 * "Charizard") — el mismo mecanismo que usaría `npm run sync:catalog` en producción,
 * solo que contra un fixture fijo en vez de la API real.
 */
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

  execSync("npm run sync:catalog", {
    cwd: backendDir,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl, CATALOG_PROVIDER: "fake" },
  });
}
