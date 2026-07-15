import type { FastifyInstance } from "fastify";
import type { createPlanItemUseCases } from "../../application/planItems.js";
import type { createPlanSettingsUseCases } from "../../application/planSettings.js";
import type { NewPlanItem, PlanSettings } from "../../domain/types.js";
import { handleError, registerCrudRoutes } from "./crudRoutes.js";

export function registerPlanRoutes(
  app: FastifyInstance,
  planItemUseCases: ReturnType<typeof createPlanItemUseCases>,
  planSettingsUseCases: ReturnType<typeof createPlanSettingsUseCases>,
): void {
  registerCrudRoutes<Awaited<ReturnType<typeof planItemUseCases.create>>, NewPlanItem>(
    app,
    "/plan-items",
    planItemUseCases,
  );

  app.post("/plan-items/:id/toggle-done", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updated = await planItemUseCases.toggleDone(id);
      if (!updated) {
        reply.code(404).send({ error: "No encontrado" });
        return;
      }
      reply.send(updated);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.get("/plan-settings", async () => planSettingsUseCases.get());

  app.put("/plan-settings", async (request, reply) => {
    try {
      const updated = await planSettingsUseCases.update(request.body as PlanSettings);
      reply.send(updated);
    } catch (error) {
      handleError(error, reply);
    }
  });
}
