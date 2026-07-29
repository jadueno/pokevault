import type { FastifyInstance, FastifyRequest } from "fastify";
import type { Pool } from "pg";
import { createSetChecklistRepository } from "../db/repositories/setChecklistRepository.js";
import { createSetChecklistUseCases } from "../../application/setChecklists.js";
import type { PokemonTcgProvider } from "../../domain/ports.js";
import { handleError } from "./crudRoutes.js";

function useCasesFor(pool: Pool, provider: PokemonTcgProvider, request: FastifyRequest) {
  return createSetChecklistUseCases(createSetChecklistRepository(pool, request.userId), provider);
}

export function registerSetChecklistRoutes(app: FastifyInstance, pool: Pool, provider: PokemonTcgProvider): void {
  app.get("/set-checklists", async (request) => useCasesFor(pool, provider, request).list());

  app.get("/set-checklists/:id/cards", async (request) => {
    const { id } = request.params as { id: string };
    return useCasesFor(pool, provider, request).getCards(id);
  });

  app.get("/set-search", async (request, reply) => {
    try {
      const { q } = request.query as { q?: string };
      return await useCasesFor(pool, provider, request).search(q ?? "");
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.get("/card-search", async (request, reply) => {
    try {
      const { name, setName, number } = request.query as { name?: string; setName?: string; number?: string };
      return await useCasesFor(pool, provider, request).searchCards(name ?? "", setName ?? null, number ?? null);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.post("/set-checklists", async (request, reply) => {
    try {
      const { externalSetId, setNameEs } = request.body as { externalSetId: string; setNameEs: string | null };
      const result = await useCasesFor(pool, provider, request).sync(externalSetId, setNameEs ?? null);
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
      const result = await useCasesFor(pool, provider, request).createBinder(title, pokemonNames ?? []);
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
    const result = await useCasesFor(pool, provider, request).resync(id);
    if (!result) {
      reply.code(404).send({ error: "No se ha podido actualizar" });
      return;
    }
    reply.send(result);
  });
}
