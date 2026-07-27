import Fastify from "fastify";
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
import { createCollectionItemRepository } from "../db/repositories/collectionItemRepository.js";
import { createWishlistItemRepository } from "../db/repositories/wishlistItemRepository.js";
import { createSealedPurchaseRepository } from "../db/repositories/sealedPurchaseRepository.js";
import { createPlanItemRepository } from "../db/repositories/planItemRepository.js";
import { createPlanSettingsRepository } from "../db/repositories/planSettingsRepository.js";
import { createSetChecklistRepository } from "../db/repositories/setChecklistRepository.js";
import { createCollectionItemUseCases } from "../../application/collectionItems.js";
import { createWishlistItemUseCases } from "../../application/wishlistItems.js";
import { createSealedPurchaseUseCases } from "../../application/sealedPurchases.js";
import { createPlanItemUseCases } from "../../application/planItems.js";
import { createPlanSettingsUseCases } from "../../application/planSettings.js";
import { createSetChecklistUseCases } from "../../application/setChecklists.js";

export interface BuildServerOptions {
  logger?: boolean;
  apiToken?: string;
}

export async function buildServer(pool: Pool, pokemonTcgProvider: PokemonTcgProvider, options: BuildServerOptions = {}) {
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
  // Límite generoso: la app la usa una sola persona, así que esto no debería notarse
  // nunca en uso normal, solo frena un abuso (o un bug) que dispare peticiones sin control.
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  app.get("/health", async () => ({ status: "ok" }));

  registerAuth(app, options.apiToken);

  const collectionItemRepository = createCollectionItemRepository(pool);
  const wishlistItemRepository = createWishlistItemRepository(pool);
  const sealedPurchaseRepository = createSealedPurchaseRepository(pool);
  const planItemRepository = createPlanItemRepository(pool);
  const planSettingsRepository = createPlanSettingsRepository(pool);
  const setChecklistRepository = createSetChecklistRepository(pool);

  const collectionItemUseCases = createCollectionItemUseCases(collectionItemRepository);
  const wishlistItemUseCases = createWishlistItemUseCases(wishlistItemRepository, collectionItemRepository);
  const sealedPurchaseUseCases = createSealedPurchaseUseCases(sealedPurchaseRepository);
  const planItemUseCases = createPlanItemUseCases(planItemRepository);
  const planSettingsUseCases = createPlanSettingsUseCases(planSettingsRepository);
  const setChecklistUseCases = createSetChecklistUseCases(setChecklistRepository, pokemonTcgProvider);

  registerCollectionRoutes(app, collectionItemUseCases);
  registerWishlistRoutes(app, wishlistItemUseCases);
  registerSealedPurchaseRoutes(app, sealedPurchaseUseCases);
  registerPlanRoutes(app, planItemUseCases, planSettingsUseCases);
  registerSetChecklistRoutes(app, setChecklistUseCases);

  return app;
}
