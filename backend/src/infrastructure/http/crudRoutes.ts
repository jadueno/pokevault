import type { FastifyInstance } from "fastify";
import { ValidationError } from "../../application/errors.js";

interface CrudUseCases<T, TNew> {
  list: () => Promise<T[]>;
  create: (entity: TNew) => Promise<T>;
  update: (id: string, entity: TNew) => Promise<T | null>;
  remove: (id: string) => Promise<boolean>;
}

/** Registra GET/POST/PUT/DELETE estándar para un recurso sobre unos casos de uso con la misma forma. */
export function registerCrudRoutes<T, TNew>(
  app: FastifyInstance,
  path: string,
  useCases: CrudUseCases<T, TNew>,
): void {
  app.get(path, async () => useCases.list());

  app.post(path, async (request, reply) => {
    try {
      const created = await useCases.create(request.body as TNew);
      reply.code(201).send(created);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.put(`${path}/:id`, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updated = await useCases.update(id, request.body as TNew);
      if (!updated) {
        reply.code(404).send({ error: "No encontrado" });
        return;
      }
      reply.send(updated);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.delete(`${path}/:id`, async (request, reply) => {
    const { id } = request.params as { id: string };
    const removed = await useCases.remove(id);
    if (!removed) {
      reply.code(404).send({ error: "No encontrado" });
      return;
    }
    reply.code(204).send();
  });
}

export function handleError(error: unknown, reply: import("fastify").FastifyReply): void {
  if (error instanceof ValidationError) {
    reply.code(400).send({ error: error.message });
    return;
  }
  throw error;
}
