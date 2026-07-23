import "./infrastructure/loadEnv.js";
import { pool } from "./infrastructure/db/pool.js";
import { buildServer } from "./infrastructure/http/server.js";
import { createTcgdexApiProvider } from "./infrastructure/catalog/tcgdexApiProvider.js";
import { createFakePokemonTcgProvider } from "./infrastructure/catalog/fakePokemonTcgProvider.js";
import { createOllamaVisionProvider } from "./infrastructure/vision/ollamaVisionProvider.js";
import { createFakeVisionProvider } from "./infrastructure/vision/fakeVisionProvider.js";

const port = Number(process.env.PORT ?? 3004);

// El proveedor real es TCGdex (tcgdex.dev): gratis, sin API key, mucho más fiable que
// pokemontcg.io en las pruebas hechas antes de cambiar (ver ARCHITECTURE.md) — aun así,
// haría el E2E lento y dependiente de red si lo usara también. Mismo criterio que el
// proveedor de visión de abajo: fake forzado explícitamente para tests.
const pokemonTcgProvider =
  process.env.POKEMON_TCG_PROVIDER === "fake" ? createFakePokemonTcgProvider() : createTcgdexApiProvider();

// Reconocimiento de fotos: Ollama local si está configurado (gratis, privado,
// recomendado para uso personal), simulado si no hay nada configurado (para poder
// clonar y correr la app sin instalar nada) — mismo criterio que "nous".
const visionProvider = process.env.OLLAMA_BASE_URL
  ? createOllamaVisionProvider(process.env.OLLAMA_BASE_URL, process.env.OLLAMA_VISION_MODEL)
  : createFakeVisionProvider();

async function main() {
  const app = await buildServer(pool, pokemonTcgProvider, visionProvider, {
    apiToken: process.env.API_TOKEN,
  });
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
