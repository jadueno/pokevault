import type { FastifyInstance } from "fastify";
import type { createSealedPurchaseUseCases } from "../../application/sealedPurchases.js";
import type { NewSealedPurchase } from "../../domain/types.js";
import { handleError } from "./crudRoutes.js";

export function registerSealedPurchaseRoutes(
  app: FastifyInstance,
  useCases: ReturnType<typeof createSealedPurchaseUseCases>,
): void {
  app.get("/sealed-purchases", async () => useCases.list());

  app.post("/sealed-purchases", async (request, reply) => {
    try {
      const created = await useCases.create(request.body as NewSealedPurchase);
      reply.code(201).send(created);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.put("/sealed-purchases/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updated = await useCases.update(id, request.body as NewSealedPurchase);
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
    const removed = await useCases.remove(id);
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
