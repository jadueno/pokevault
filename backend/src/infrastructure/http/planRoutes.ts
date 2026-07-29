import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { createPlanItemRepository } from "../db/repositories/planItemRepository.js";
import { createPlanSettingsRepository } from "../db/repositories/planSettingsRepository.js";
import { createPlanItemUseCases } from "../../application/planItems.js";
import { createPlanSettingsUseCases } from "../../application/planSettings.js";
import type { NewPlanItem, PlanItem, PlanSettings } from "../../domain/types.js";
import { handleError, registerCrudRoutes } from "./crudRoutes.js";

function planItemUseCasesFor(pool: Pool, request: FastifyRequest) {
  return createPlanItemUseCases(createPlanItemRepository(pool, request.userId));
}

function planSettingsUseCasesFor(pool: Pool, request: FastifyRequest) {
  return createPlanSettingsUseCases(createPlanSettingsRepository(pool, request.userId));
}

export function registerPlanRoutes(app: FastifyInstance, pool: Pool): void {
  registerCrudRoutes<PlanItem, NewPlanItem>(app, "/plan-items", (request) => planItemUseCasesFor(pool, request));

  app.post("/plan-items/:id/toggle-done", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updated = await planItemUseCasesFor(pool, request).toggleDone(id);
      if (!updated) {
        reply.code(404).send({ error: "No encontrado" });
        return;
      }
      reply.send(updated);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.get("/plan-settings", async (request) => planSettingsUseCasesFor(pool, request).get());

  app.put("/plan-settings", async (request, reply) => {
    try {
      const updated = await planSettingsUseCasesFor(pool, request).update(request.body as PlanSettings);
      reply.send(updated);
    } catch (error) {
      handleError(error, reply);
    }
  });
}
