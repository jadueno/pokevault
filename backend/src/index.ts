import "dotenv/config";
import { pool } from "./infrastructure/db/pool.js";
import { buildServer } from "./infrastructure/http/server.js";
import { createTcgdexApiProvider } from "./infrastructure/catalog/tcgdexApiProvider.js";
import { createFakePokemonTcgProvider } from "./infrastructure/catalog/fakePokemonTcgProvider.js";

const port = Number(process.env.PORT ?? 3004);

// El proveedor real es TCGdex (tcgdex.dev): gratis, sin API key, mucho más fiable que
// pokemontcg.io en las pruebas hechas antes de cambiar (ver ARCHITECTURE.md) — aun así,
// haría el E2E lento y dependiente de red si lo usara también. Mismo criterio que el
// proveedor de visión que existió: fake forzado explícitamente para tests.
const pokemonTcgProvider =
  process.env.POKEMON_TCG_PROVIDER === "fake" ? createFakePokemonTcgProvider() : createTcgdexApiProvider();

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
