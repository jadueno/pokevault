import type { FastifyInstance } from "fastify";
import type { createSetChecklistUseCases } from "../../application/setChecklists.js";
import { handleError } from "./crudRoutes.js";

export function registerSetChecklistRoutes(
  app: FastifyInstance,
  useCases: ReturnType<typeof createSetChecklistUseCases>,
): void {
  app.get("/set-checklists", async () => useCases.list());

  app.get("/set-checklists/:id/cards", async (request) => {
    const { id } = request.params as { id: string };
    return useCases.getCards(id);
  });

  app.get("/set-search", async (request, reply) => {
    try {
      const { q } = request.query as { q?: string };
      return await useCases.search(q ?? "");
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.get("/card-search", async (request, reply) => {
    try {
      const { name, setName, number } = request.query as { name?: string; setName?: string; number?: string };
      return await useCases.searchCards(name ?? "", setName ?? null, number ?? null);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.post("/set-checklists", async (request, reply) => {
    try {
      const { externalSetId, setNameEs } = request.body as { externalSetId: string; setNameEs: string | null };
      const result = await useCases.sync(externalSetId, setNameEs ?? null);
      if (!result) {
        reply.code(404).send({ error: "No se ha encontrado o ya estaba sincronizado" });
        return;
      }
      reply.code(201).send(result);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.post("/set-checklists/binder", async (request, reply) => {
    try {
      const { title, pokemonNames } = request.body as { title: string; pokemonNames: string[] };
      const result = await useCases.createBinder(title, pokemonNames ?? []);
      if (!result) {
        reply.code(404).send({ error: "No se ha encontrado ninguna carta o ya existía este binder" });
        return;
      }
      reply.code(201).send(result);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.post("/set-checklists/:id/resync", async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await useCases.resync(id);
    if (!result) {
      reply.code(404).send({ error: "No se ha podido actualizar" });
      return;
    }
    reply.send(result);
  });
}
