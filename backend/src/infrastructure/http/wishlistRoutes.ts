import type { FastifyInstance } from "fastify";
import type { createWishlistItemUseCases, MoveToCollectionDetails } from "../../application/wishlistItems.js";
import type { NewWishlistItem } from "../../domain/types.js";
import { handleError } from "./crudRoutes.js";

export function registerWishlistRoutes(
  app: FastifyInstance,
  useCases: ReturnType<typeof createWishlistItemUseCases>,
): void {
  app.get("/wishlist-items", async () => useCases.list());

  app.post("/wishlist-items", async (request, reply) => {
    try {
      const created = await useCases.create(request.body as NewWishlistItem);
      reply.code(201).send(created);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.put("/wishlist-items/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updated = await useCases.update(id, request.body as NewWishlistItem);
      if (!updated) {
        reply.code(404).send({ error: "No encontrado" });
        return;
      }
      reply.send(updated);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.delete("/wishlist-items/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const removed = await useCases.remove(id);
    if (!removed) {
      reply.code(404).send({ error: "No encontrado" });
      return;
    }
    reply.code(204).send();
  });

  app.post("/wishlist-items/:id/move-to-collection", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const created = await useCases.moveToCollection(id, request.body as MoveToCollectionDetails);
      reply.code(201).send(created);
    } catch (error) {
      handleError(error, reply);
    }
  });
}
