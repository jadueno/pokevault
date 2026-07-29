import "./infrastructure/loadEnv.js";
import { pool } from "./infrastructure/db/pool.js";
import { buildServer } from "./infrastructure/http/server.js";
import { createTcgdexApiProvider } from "./infrastructure/catalog/tcgdexApiProvider.js";
import { createFakePokemonTcgProvider } from "./infrastructure/catalog/fakePokemonTcgProvider.js";

const port = Number(process.env.PORT ?? 3004);

// El proveedor real es TCGdex (tcgdex.dev): gratis, sin API key, mucho más fiable que
// pokemontcg.io en las pruebas hechas antes de cambiar (ver ARCHITECTURE.md) — aun así,
// haría el E2E lento y dependiente de red si lo usara también, por eso el fake se puede
// forzar explícitamente por variable de entorno.
const pokemonTcgProvider =
  process.env.POKEMON_TCG_PROVIDER === "fake" ? createFakePokemonTcgProvider() : createTcgdexApiProvider();

// Login obligatorio (ya no opcional): con datos por usuario, cada petición necesita saber
// de quién es. LOGIN_USERNAME/LOGIN_PASSWORD_HASH ya no los lee el servidor — solo los usa
// `npm run backfill-owner-user` una vez, para crear la cuenta del dueño.
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  console.error("Falta SESSION_SECRET en el entorno: el login ya no es opcional (ver .env.example).");
  process.exit(1);
}

async function main() {
  // Ya comprobado arriba (con process.exit si faltaba) — TS no retiene el estrechado de
  // un `const` de módulo dentro de una función declarada aparte.
  const app = await buildServer(pool, pokemonTcgProvider, { sessionSecret: sessionSecret! });
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
