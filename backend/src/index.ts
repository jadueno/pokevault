import "dotenv/config";
import { pool } from "./infrastructure/db/pool.js";
import { buildServer } from "./infrastructure/http/server.js";
import { createPokemonTcgApiProvider } from "./infrastructure/catalog/pokemonTcgApiProvider.js";
import { createFakePokemonTcgProvider } from "./infrastructure/catalog/fakePokemonTcgProvider.js";

const port = Number(process.env.PORT ?? 3004);

// El proveedor real (pokemontcg.io) tiene ~45% de error y ~8s de latencia media (ver
// ARCHITECTURE.md) — nada que ver en uso normal (solo se llama al buscar/sincronizar un
// set a propósito), pero haría el E2E lento y no determinista si lo usara también. Mismo
// criterio que el proveedor de visión que existió: fake forzado explícitamente para tests.
const pokemonTcgProvider =
  process.env.POKEMON_TCG_PROVIDER === "fake" ? createFakePokemonTcgProvider() : createPokemonTcgApiProvider();

async function main() {
  const app = await buildServer(pool, pokemonTcgProvider, {
    apiToken: process.env.API_TOKEN,
  });
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
