import path from "node:path";
import { execSync } from "node:child_process";
import { randomBytes, scryptSync } from "node:crypto";
import { Client } from "pg";
import { E2E_USER_EMAIL, E2E_USER_PASSWORD } from "./testUser.js";

const TABLES = ["wishlist_items", "collection_items", "sealed_purchases", "plan_items", "plan_settings", "set_checklists", "users"];

/** Duplica `backend/src/infrastructure/http/passwordHash.ts` a propósito: `e2e/` es un
 * paquete npm aparte del backend (sin acceso directo a sus módulos TS), y esto es
 * demasiado pequeño para justificar una dependencia cruzada entre paquetes solo por esto. */
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** Prepara la base de datos de test antes de la suite E2E: migra, la deja vacía del todo
 * (incluidos `users`/`plan_settings`, que ya no son un singleton global) y crea el único
 * usuario de test con el que se autentica toda la suite (ver `auth.setup.ts`). La
 * búsqueda y sincronización de sets usa el proveedor fake en E2E (forzado en
 * playwright.config.ts con POKEMON_TCG_PROVIDER=fake), determinista sin red. */
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
  await client.query("insert into users (email, password_hash) values ($1, $2)", [E2E_USER_EMAIL, hashPassword(E2E_USER_PASSWORD)]);
  await client.end();
}
