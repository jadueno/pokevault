import type { FastifyInstance } from "fastify";
import type { createCollectionItemUseCases } from "../../application/collectionItems.js";
import type { NewCollectionItem } from "../../domain/types.js";
import { handleError } from "./crudRoutes.js";

export function registerCollectionRoutes(
  app: FastifyInstance,
  useCases: ReturnType<typeof createCollectionItemUseCases>,
): void {
  // GET /collection-items lista con la carta de catálogo ya unida (list() hace el join),
  // así que no se registra vía registerCrudRoutes para ese verbo — el resto sí encaja.
  app.get("/collection-items", async () => useCases.list());

  app.post("/collection-items", async (request, reply) => {
    try {
      const created = await useCases.create(request.body as NewCollectionItem);
      reply.code(201).send(created);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.put("/collection-items/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updated = await useCases.update(id, request.body as NewCollectionItem);
      if (!updated) {
        reply.code(404).send({ error: "No encontrado" });
        return;
      }
      reply.send(updated);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.delete("/collection-items/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const removed = await useCases.remove(id);
    if (!removed) {
      reply.code(404).send({ error: "No encontrado" });
      return;
    }
    reply.code(204).send();
  });

  app.get("/collection-items/summary", async () => useCases.summary());

  app.put("/collection-items/:id/estimated-value", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { value, note } = request.body as { value: number; note: string | null };
      const updated = await useCases.overrideEstimatedValue(id, value, note ?? null);
      if (!updated) {
        reply.code(404).send({ error: "No encontrado" });
        return;
      }
      reply.send(updated);
    } catch (error) {
      handleError(error, reply);
    }
  });
}
