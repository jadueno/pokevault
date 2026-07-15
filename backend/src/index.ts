import "dotenv/config";
import { pool } from "./infrastructure/db/pool.js";
import { buildServer } from "./infrastructure/http/server.js";

const port = Number(process.env.PORT ?? 3004);

async function main() {
  const app = await buildServer(pool, {
    apiToken: process.env.API_TOKEN,
  });
  await app.listen({ port, host: "0.0.0.0" });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
