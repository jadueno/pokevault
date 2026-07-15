import "dotenv/config";
import { Pool } from "pg";

// catalog_sets/catalog_cards/catalog_sync_log sí se truncan entre tests (a diferencia de
// "profile" en faro): aquí no son un singleton sembrado una vez, son fixtures de catálogo
// que cada test de integración necesita poder poblar desde cero.
const TABLES = [
  "wishlist_items",
  "collection_items",
  "sealed_purchases",
  "catalog_sync_log",
  "catalog_cards",
  "catalog_sets",
];

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
