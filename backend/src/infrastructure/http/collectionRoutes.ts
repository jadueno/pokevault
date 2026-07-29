import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { createCollectionItemRepository } from "../db/repositories/collectionItemRepository.js";
import { createCollectionItemUseCases } from "../../application/collectionItems.js";
import type { NewCollectionItem } from "../../domain/types.js";
import { handleError } from "./crudRoutes.js";

function useCasesFor(pool: Pool, request: FastifyRequest) {
  return createCollectionItemUseCases(createCollectionItemRepository(pool, request.userId));
}

export function registerCollectionRoutes(app: FastifyInstance, pool: Pool): void {
  app.get("/collection-items", async (request) => useCasesFor(pool, request).list());

  app.post("/collection-items", async (request, reply) => {
    try {
      const created = await useCasesFor(pool, request).create(request.body as NewCollectionItem);
      reply.code(201).send(created);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.put("/collection-items/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updated = await useCasesFor(pool, request).update(id, request.body as NewCollectionItem);
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
    const removed = await useCasesFor(pool, request).remove(id);
    if (!removed) {
      reply.code(404).send({ error: "No encontrado" });
      return;
    }
    reply.code(204).send();
  });

  app.get("/collection-items/summary", async (request) => useCasesFor(pool, request).summary());

  app.put("/collection-items/:id/estimated-value", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { value, note } = request.body as { value: number; note: string | null };
      const updated = await useCasesFor(pool, request).overrideEstimatedValue(id, value, note ?? null);
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
