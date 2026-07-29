import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { createSealedPurchaseRepository } from "../db/repositories/sealedPurchaseRepository.js";
import { createSealedPurchaseUseCases } from "../../application/sealedPurchases.js";
import type { NewSealedPurchase } from "../../domain/types.js";
import { handleError } from "./crudRoutes.js";

function useCasesFor(pool: Pool, request: FastifyRequest) {
  return createSealedPurchaseUseCases(createSealedPurchaseRepository(pool, request.userId));
}

export function registerSealedPurchaseRoutes(app: FastifyInstance, pool: Pool): void {
  app.get("/sealed-purchases", async (request) => useCasesFor(pool, request).list());

  app.post("/sealed-purchases", async (request, reply) => {
    try {
      const created = await useCasesFor(pool, request).create(request.body as NewSealedPurchase);
      reply.code(201).send(created);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.put("/sealed-purchases/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updated = await useCasesFor(pool, request).update(id, request.body as NewSealedPurchase);
      if (!updated) {
        reply.code(404).send({ error: "No encontrado" });
        return;
      }
      reply.send(updated);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.delete("/sealed-purchases/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const removed = await useCasesFor(pool, request).remove(id);
    if (!removed) {
      reply.code(404).send({ error: "No encontrado" });
      return;
    }
    reply.code(204).send();
  });

  app.put("/sealed-purchases/:id/estimated-value", async (request, reply) => {
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
