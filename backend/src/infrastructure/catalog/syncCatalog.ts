import "dotenv/config";
import { pool } from "../db/pool.js";
import { createCatalogRepository } from "../db/repositories/catalogRepository.js";
import { createFakeCatalogProvider } from "./fakeCatalogProvider.js";
import { createPokemonTcgApiProvider } from "./pokemonTcgApiProvider.js";

// La API de pokemontcg.io funciona sin key (con menos rate limit) — por eso el
// proveedor real es el valor por defecto; CATALOG_PROVIDER=fake es solo para probar el
// job sin red (tests/CI, o comprobar el flujo en local sin gastar cuota).
const provider =
  process.env.CATALOG_PROVIDER === "fake"
    ? createFakeCatalogProvider()
    : createPokemonTcgApiProvider(process.env.POKEMON_TCG_API_KEY);

async function sync() {
  const repo = createCatalogRepository(pool);
  const log = await repo.createSyncLog(provider.name);

  let setsSynced = 0;
  let cardsSynced = 0;
  try {
    const externalSets = await provider.listSets();
    for (const externalSet of externalSets) {
      const set = await repo.upsertSet(provider.name, externalSet);
      setsSynced++;

      let page = 1;
      let setCardCount = 0;
      for (;;) {
        const { cards, hasMore } = await provider.listCardsBySet(externalSet.externalId, page);
        for (const card of cards) {
          await repo.upsertCard(provider.name, set.id, card);
          cardsSynced++;
          setCardCount++;
        }
        if (!hasMore) break;
        page++;
      }
      console.log(`Set sincronizado: ${set.name} (${setCardCount} cartas)`);
    }

    await repo.finishSyncLog(log.id, { status: "success", setsSynced, cardsSynced });
    console.log(`Sincronización completa: ${setsSynced} sets, ${cardsSynced} cartas.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    await repo.finishSyncLog(log.id, { status: "failed", setsSynced, cardsSynced, error: message });
    console.error("Sincronización fallida:", message);
    throw error;
  }
}

sync()
  .then(() => pool.end())
  .catch((error) => {
    console.error(error);
    pool.end().finally(() => process.exit(1));
  });
