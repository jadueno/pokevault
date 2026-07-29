import "../infrastructure/loadEnv.js";
import { pool } from "../infrastructure/db/pool.js";
import { createSetChecklistRepository } from "../infrastructure/db/repositories/setChecklistRepository.js";
import { createTcgdexApiProvider } from "../infrastructure/catalog/tcgdexApiProvider.js";
import { createSetChecklistUseCases } from "../application/setChecklists.js";

/**
 * Refresca el precio de referencia de todos los sets/binders ya sincronizados, de TODOS
 * los usuarios, llamando a TCGdex una vez por checklist (mismo `resync` que el botón
 * "🔄 Actualizar" manual). Pensado para un cron periódico en el servidor (ver
 * ARCHITECTURE.md, "Actualización periódica de precio") — decisión explícita del usuario
 * de automatizarlo, aun sabiendo que esto excepciona la regla general de la app de no
 * llamar nunca al proveedor externo fuera de una acción explícita: aquí SÍ se ejecuta sin
 * que nadie esté mirando, a cambio de no tener que acordarse de pulsar "Actualizar" en
 * cada set a mano.
 *
 * Nunca se ejecuta vía HTTP (no hay endpoint para esto, ni falta que hace): un script de
 * servidor con acceso directo al pool, igual que `seedDemoData.ts`/`hashPassword.ts` — así
 * no hace falta autenticarse contra la propia API ni guardar la contraseña en ningún cron.
 *
 * Uso: npm run refresh-checklist-prices
 */
const DELAY_BETWEEN_CHECKLISTS_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  const provider = createTcgdexApiProvider();
  const { rows: users } = await pool.query<{ id: string }>("select id from users");
  console.log(`${users.length} usuario(s).`);

  let ok = 0;
  let failed = 0;
  for (const user of users) {
    const repo = createSetChecklistRepository(pool, user.id);
    const useCases = createSetChecklistUseCases(repo, provider);
    const checklists = await repo.list();

    for (const checklist of checklists) {
      const label = checklist.setNameEs ?? checklist.setName;
      try {
        const result = await useCases.resync(checklist.id);
        if (result) {
          ok++;
          console.log(`✓ ${label}`);
        } else {
          failed++;
          console.log(`✗ ${label} — el proveedor no respondió (ver ARCHITECTURE.md, resync nunca lanza, solo devuelve null)`);
        }
      } catch (error) {
        failed++;
        console.error(`✗ ${label} —`, error);
      }
      await sleep(DELAY_BETWEEN_CHECKLISTS_MS);
    }
  }

  console.log(`Hecho: ${ok} actualizado(s), ${failed} sin cambios/con error.`);
}

main()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error);
    return pool.end().finally(() => process.exit(1));
  });
