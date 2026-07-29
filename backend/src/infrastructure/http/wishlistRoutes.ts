import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { createWishlistItemRepository } from "../db/repositories/wishlistItemRepository.js";
import { createCollectionItemRepository } from "../db/repositories/collectionItemRepository.js";
import { createWishlistItemUseCases, type MoveToCollectionDetails } from "../../application/wishlistItems.js";
import type { NewWishlistItem } from "../../domain/types.js";
import { handleError } from "./crudRoutes.js";

function useCasesFor(pool: Pool, request: FastifyRequest) {
  const wishlistRepo = createWishlistItemRepository(pool, request.userId);
  const collectionRepo = createCollectionItemRepository(pool, request.userId);
  return createWishlistItemUseCases(wishlistRepo, collectionRepo);
}

export function registerWishlistRoutes(app: FastifyInstance, pool: Pool): void {
  app.get("/wishlist-items", async (request) => useCasesFor(pool, request).list());

  app.post("/wishlist-items", async (request, reply) => {
    try {
      const created = await useCasesFor(pool, request).create(request.body as NewWishlistItem);
      reply.code(201).send(created);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.put("/wishlist-items/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updated = await useCasesFor(pool, request).update(id, request.body as NewWishlistItem);
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
    const removed = await useCasesFor(pool, request).remove(id);
    if (!removed) {
      reply.code(404).send({ error: "No encontrado" });
      return;
    }
    reply.code(204).send();
  });

  app.post("/wishlist-items/:id/move-to-collection", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const created = await useCasesFor(pool, request).moveToCollection(id, request.body as MoveToCollectionDetails);
      reply.code(201).send(created);
    } catch (error) {
      handleError(error, reply);
    }
  });
}
