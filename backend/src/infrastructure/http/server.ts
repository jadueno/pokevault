import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { Pool } from "pg";
import { registerAuth } from "./auth.js";
import { registerCatalogRoutes } from "./catalogRoutes.js";
import { registerCollectionRoutes } from "./collectionRoutes.js";
import { registerWishlistRoutes } from "./wishlistRoutes.js";
import { registerSealedPurchaseRoutes } from "./sealedPurchaseRoutes.js";
import { registerPlanRoutes } from "./planRoutes.js";
import { createCatalogRepository } from "../db/repositories/catalogRepository.js";
import { createCollectionItemRepository } from "../db/repositories/collectionItemRepository.js";
import { createWishlistItemRepository } from "../db/repositories/wishlistItemRepository.js";
import { createSealedPurchaseRepository } from "../db/repositories/sealedPurchaseRepository.js";
import { createPlanItemRepository } from "../db/repositories/planItemRepository.js";
import { createPlanSettingsRepository } from "../db/repositories/planSettingsRepository.js";
import { createCatalogUseCases } from "../../application/catalog.js";
import { createCollectionItemUseCases } from "../../application/collectionItems.js";
import { createWishlistItemUseCases } from "../../application/wishlistItems.js";
import { createSealedPurchaseUseCases } from "../../application/sealedPurchases.js";
import { createPlanItemUseCases } from "../../application/planItems.js";
import { createPlanSettingsUseCases } from "../../application/planSettings.js";

export interface BuildServerOptions {
  logger?: boolean;
  apiToken?: string;
}

export async function buildServer(pool: Pool, options: BuildServerOptions = {}) {
  const app = Fastify({ logger: options.logger ?? true });
  // CSP desactivada a propósito: esta API solo devuelve JSON, nunca HTML/JS, así que
  // una Content-Security-Policy (pensada para páginas renderizadas) no aporta nada aquí.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true, methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] });
  // Límite generoso: la app la usa una sola persona, así que esto no debería notarse
  // nunca en uso normal, solo frena un abuso (o un bug) que dispare peticiones sin control.
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

  app.get("/health", async () => ({ status: "ok" }));

  registerAuth(app, options.apiToken);

  const catalogRepository = createCatalogRepository(pool);
  const collectionItemRepository = createCollectionItemRepository(pool);
  const wishlistItemRepository = createWishlistItemRepository(pool);
  const sealedPurchaseRepository = createSealedPurchaseRepository(pool);
  const planItemRepository = createPlanItemRepository(pool);
  const planSettingsRepository = createPlanSettingsRepository(pool);

  const catalogUseCases = createCatalogUseCases(catalogRepository);
  const collectionItemUseCases = createCollectionItemUseCases(collectionItemRepository, catalogRepository);
  const wishlistItemUseCases = createWishlistItemUseCases(
    wishlistItemRepository,
    catalogRepository,
    collectionItemRepository,
  );
  const sealedPurchaseUseCases = createSealedPurchaseUseCases(sealedPurchaseRepository);
  const planItemUseCases = createPlanItemUseCases(planItemRepository);
  const planSettingsUseCases = createPlanSettingsUseCases(planSettingsRepository);

  registerCatalogRoutes(app, catalogUseCases);
  registerCollectionRoutes(app, collectionItemUseCases);
  registerWishlistRoutes(app, wishlistItemUseCases);
  registerSealedPurchaseRoutes(app, sealedPurchaseUseCases);
  registerPlanRoutes(app, planItemUseCases, planSettingsUseCases);

  return app;
}
