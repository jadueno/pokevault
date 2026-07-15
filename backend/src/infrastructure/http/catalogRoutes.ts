import type { FastifyInstance } from "fastify";
import type { createCatalogUseCases } from "../../application/catalog.js";

export function registerCatalogRoutes(app: FastifyInstance, useCases: ReturnType<typeof createCatalogUseCases>): void {
  app.get("/catalog/sets", async () => useCases.listSets());

  app.get("/catalog/cards", async (request) => {
    const { q, setId, rarity, page, pageSize } = request.query as Record<string, string | undefined>;
    return useCases.searchCards({
      query: q,
      setId,
      rarity,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  });

  app.get("/catalog/cards/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = await useCases.getCard(id);
    if (!card) {
      reply.code(404).send({ error: "No encontrada" });
      return;
    }
    reply.send(card);
  });
}
