import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { Pool } from "pg";
import type { PokemonTcgProvider } from "../../domain/ports.js";
import { registerAuth } from "./auth.js";
import { registerCollectionRoutes } from "./collectionRoutes.js";
import { registerWishlistRoutes } from "./wishlistRoutes.js";
import { registerSealedPurchaseRoutes } from "./sealedPurchaseRoutes.js";
import { registerPlanRoutes } from "./planRoutes.js";
import { registerSetChecklistRoutes } from "./setChecklistRoutes.js";
import { createUserRepository } from "../db/repositories/userRepository.js";

export interface BuildServerOptions {
  logger?: boolean;
  sessionSecret: string;
}

export async function buildServer(pool: Pool, pokemonTcgProvider: PokemonTcgProvider, options: BuildServerOptions) {
  const app = Fastify({
    logger: options.logger ?? true,
    // Fotos como data URL en el body de cartas/producto sellado: el límite por defecto
    // (1MB) se queda corto. El frontend ya comprime la imagen antes de enviarla, este
    // límite es solo una red de seguridad generosa, no el tamaño esperado habitual.
    bodyLimit: 8 * 1024 * 1024,
  });
  // CSP desactivada a propósito: esta API solo devuelve JSON, nunca HTML/JS, así que
  // una Content-Security-Policy (pensada para páginas renderizadas) no aporta nada aquí.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true, methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] });
  // Límite generoso: pensado para que no se note en uso normal, solo frena un abuso (o un
  // bug) que dispare peticiones sin control.
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  // Sin esto, un error no controlado (p. ej. uno real de Postgres) llega al cliente tal
  // cual vía el manejador por defecto de Fastify, que sí serializa `error.message` en la
  // respuesta — puede filtrar detalle interno (nombre de columna, mensaje del driver) en
  // una API ya expuesta a internet. El error completo se sigue registrando en el logger.
  app.setErrorHandler((error: FastifyError, request, reply) => {
    const statusCode = error.statusCode ?? 500;
    if (statusCode >= 500) {
      request.log.error(error);
      reply.code(500).send({ error: "Error interno del servidor" });
      return;
    }
    reply.code(statusCode).send({ error: error.message });
  });

  app.get("/health", async () => ({ status: "ok" }));

  const userRepository = createUserRepository(pool);
  registerAuth(app, userRepository, { sessionSecret: options.sessionSecret });

  registerCollectionRoutes(app, pool);
  registerWishlistRoutes(app, pool);
  registerSealedPurchaseRoutes(app, pool);
  registerPlanRoutes(app, pool);
  registerSetChecklistRoutes(app, pool, pokemonTcgProvider);

  return app;
}
