import "../infrastructure/loadEnv.js";
import { pool } from "../infrastructure/db/pool.js";
import { refreshCatalogCards } from "../infrastructure/db/repositories/setChecklistRepository.js";
import { createTcgdexApiProvider } from "../infrastructure/catalog/tcgdexApiProvider.js";
import type { SetChecklistKind } from "../domain/types.js";

/**
 * Refresca el precio de referencia de todos los sets/binders sincronizados, llamando a
 * TCGdex UNA VEZ POR CATÁLOGO COMPARTIDO (no una vez por usuario que lo tenga añadido —
 * ver migración 1784000000019/ARCHITECTURE.md, justo el ahorro que motivó separar
 * `set_catalogs` de `set_checklists`). Mismo `resync` que el botón "🔄 Actualizar" manual,
 * pero a nivel de catálogo directamente: no hay "usuario actual" para un cron, así que no
 * tiene sentido pasar por el repositorio acotado a userId.
 *
 * Nunca se ejecuta vía HTTP: script de servidor con acceso directo al pool, igual que
 * `seedDemoData.ts`/`backfillOwnerUser.ts` — decisión explícita del usuario de
 * automatizarlo, aun sabiendo que esto excepciona la regla general de la app de no llamar
 * nunca al proveedor externo fuera de una acción explícita (ver ARCHITECTURE.md).
 *
 * Uso: npm run refresh-checklist-prices
 */
const DELAY_BETWEEN_CATALOGS_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface CatalogRow {
  id: string;
  external_set_id: string;
  set_name: string;
  kind: SetChecklistKind;
  pokemon_names: string[] | null;
}

async function main(): Promise<void> {
  const provider = createTcgdexApiProvider();
  const { rows: catalogs } = await pool.query<CatalogRow>(
    "select id, external_set_id, set_name, kind, pokemon_names from set_catalogs",
  );
  console.log(`${catalogs.length} catálogo(s) compartido(s).`);

  let ok = 0;
  let failed = 0;
  for (const catalog of catalogs) {
    try {
      const { setName, cards } =
        catalog.kind === "binder"
          ? { setName: catalog.set_name, cards: await provider.getCardsByPokemonNames(catalog.pokemon_names ?? []) }
          : await provider.getSetCards(catalog.external_set_id);
      await refreshCatalogCards(pool, catalog.id, { setName, cards });
      ok++;
      console.log(`✓ ${catalog.set_name}`);
    } catch (error) {
      failed++;
      console.error(`✗ ${catalog.set_name} —`, error);
    }
    await sleep(DELAY_BETWEEN_CATALOGS_MS);
  }

  console.log(`Hecho: ${ok} actualizado(s), ${failed} sin cambios/con error.`);
}

main()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error);
    return pool.end().finally(() => process.exit(1));
  });
