import type { FastifyInstance, FastifyRequest } from "fastify";
import { ValidationError } from "../../application/errors.js";

interface CrudUseCases<T, TNew> {
  list: () => Promise<T[]>;
  create: (entity: TNew) => Promise<T>;
  update: (id: string, entity: TNew) => Promise<T | null>;
  remove: (id: string) => Promise<boolean>;
}

/** Registra GET/POST/PUT/DELETE estándar para un recurso. `useCasesFor` construye los
 * casos de uso (sobre un repositorio acotado a `request.userId`) en cada petición, en vez
 * de recibir un objeto ya construido al arrancar el servidor — el `userId` solo se conoce
 * por request, tras verificar el token (ver auth.ts). */
export function registerCrudRoutes<T, TNew>(
  app: FastifyInstance,
  path: string,
  useCasesFor: (request: FastifyRequest) => CrudUseCases<T, TNew>,
): void {
  app.get(path, async (request) => useCasesFor(request).list());

  app.post(path, async (request, reply) => {
    try {
      const created = await useCasesFor(request).create(request.body as TNew);
      reply.code(201).send(created);
    } catch (error) {
      handleError(error, reply);
    }
  });

  app.put(`${path}/:id`, async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const updated = await useCasesFor(request).update(id, request.body as TNew);
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
    const removed = await useCasesFor(request).remove(id);
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
