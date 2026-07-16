import "dotenv/config";
import { pool } from "./infrastructure/db/pool.js";
import { buildServer } from "./infrastructure/http/server.js";
import { createOllamaVisionProvider } from "./infrastructure/vision/ollamaVisionProvider.js";
import { createFakeVisionProvider } from "./infrastructure/vision/fakeVisionProvider.js";

const port = Number(process.env.PORT ?? 3004);

// Mismo criterio que "nous": Ollama local si está configurado (gratis, privado,
// recomendado para uso personal), simulado si no hay nada configurado (para poder
// clonar y correr la app sin instalar nada).
const visionProvider = process.env.OLLAMA_BASE_URL
  ? createOllamaVisionProvider(process.env.OLLAMA_BASE_URL, process.env.OLLAMA_VISION_MODEL)
  : createFakeVisionProvider();

async function main() {
  const app = await buildServer(pool, visionProvider, {
    apiToken: process.env.API_TOKEN,
  });
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
