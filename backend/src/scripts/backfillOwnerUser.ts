import "../infrastructure/loadEnv.js";
import { pool } from "../infrastructure/db/pool.js";

/**
 * Script puntual (no migración): crea/actualiza el usuario dueño de la instancia a
 * partir de LOGIN_USERNAME/LOGIN_PASSWORD_HASH (mismo hash que ya usaba el login de
 * usuario único, generado con `npm run hash-password` — la contraseña no cambia) y le
 * asigna TODAS las filas existentes que aún no tengan `user_id` (paso intermedio de la
 * migración multi-usuario, entre 1784000000017 y 1784000000018 — ver ese par de
 * migraciones para el resto del contexto). Nunca se comitea un hash real a git: esto solo
 * lee variables de entorno en tiempo de ejecución, igual que `seedDemoData.ts`/
 * `hashPassword.ts`/`refreshChecklistPrices.ts`.
 *
 * Idempotente: se puede volver a ejecutar sin duplicar nada (upsert por email, el
 * backfill solo toca filas con `user_id is null`). En una base de datos vacía (dev/test/
 * CI/E2E) simplemente crea el usuario sin backfillear nada.
 *
 * Uso: npm run backfill-owner-user
 */
const SCOPED_TABLES = ["sealed_purchases", "collection_items", "wishlist_items", "plan_items", "plan_settings", "set_checklists"];

async function main(): Promise<void> {
  const email = process.env.LOGIN_USERNAME;
  const passwordHash = process.env.LOGIN_PASSWORD_HASH;
  if (!email || !passwordHash) {
    console.error("Faltan LOGIN_USERNAME/LOGIN_PASSWORD_HASH en el entorno.");
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query("begin");

    const { rows } = await client.query<{ id: string }>(
      `insert into users (email, password_hash) values ($1, $2)
       on conflict (email) do update set password_hash = excluded.password_hash
       returning id`,
      [email, passwordHash],
    );
    const userId = rows[0].id;

    for (const table of SCOPED_TABLES) {
      const { rowCount } = await client.query(`update ${table} set user_id = $1 where user_id is null`, [userId]);
      console.log(`${table}: ${rowCount ?? 0} fila(s) asignada(s) a ${email}`);
    }

    await client.query("commit");
    console.log(`Usuario ${email} listo (id ${userId}).`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

main()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error);
    return pool.end().finally(() => process.exit(1));
  });
