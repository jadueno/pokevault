import "../infrastructure/loadEnv.js";
import { Pool } from "pg";

// "plan_settings" no está aquí a propósito: cada usuario tiene su propia fila (ver
// migración de multi-usuario), pero como no es una colección de fixtures propiamente
// (se crea perezosamente al pedirla), truncarla no aporta nada especial frente al resto.
// "set_catalogs" (no "set_checklists"): desde que se separó el catálogo compartido del
// puntero por usuario (ver migración 1784000000019), las cartas cuelgan de
// "set_catalogs" (set_catalog_cards.catalog_id), y "set_checklists" también referencia
// "set_catalogs" (catalog_id) — truncar "set_catalogs" en cascada vacía las tres tablas.
// "users" no está aquí a propósito, a diferencia del resto: server.test.ts crea UN
// usuario fijo en su beforeAll (no por test) y lo reutiliza en los 36 tests del fichero
// — truncarla en cada afterEach borraría ese usuario a mitad de la suite y las
// inserciones siguientes (collection_items, wishlist_items...) fallarían por la FK
// "user_id" → "users(id)". La propia server.test.ts limpia su usuario en afterAll.
const TABLES = ["wishlist_items", "collection_items", "sealed_purchases", "plan_items", "set_catalogs"];

/**
 * Pool conectado a TEST_DATABASE_URL, nunca a la base real. Falla pronto y con un
 * mensaje claro si la variable no está puesta o apunta por error a la base de
 * producción, para no arriesgarse a truncar datos reales.
 */
export function createTestPool(): Pool {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Falta TEST_DATABASE_URL en el entorno. Configúrala en backend/.env apuntando a una base de datos de test (nunca a la real).",
    );
  }
  if (connectionString === process.env.DATABASE_URL) {
    throw new Error("TEST_DATABASE_URL no puede ser igual que DATABASE_URL: los tests truncarían tus datos reales.");
  }
  const pool = new Pool({ connectionString });
  pool.on("error", (err) => {
    console.error("Error inesperado en un cliente inactivo del pool de test", err);
  });
  return pool;
}

/** Vacía todas las tablas de la app entre tests, sin recrear el esquema. */
export async function resetDatabase(pool: Pool): Promise<void> {
  await pool.query(`truncate table ${TABLES.join(", ")} restart identity cascade`);
}
