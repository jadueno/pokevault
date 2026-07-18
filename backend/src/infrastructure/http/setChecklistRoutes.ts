import type { FastifyInstance } from "fastify";
import type { createSetChecklistUseCases } from "../../application/setChecklists.js";

export function registerSetChecklistRoutes(
  app: FastifyInstance,
  useCases: ReturnType<typeof createSetChecklistUseCases>,
): void {
  app.get("/set-checklists", async () => useCases.list());

  app.get("/set-checklists/:id/cards", async (request) => {
    const { id } = request.params as { id: string };
    return useCases.getCards(id);
  });
}
