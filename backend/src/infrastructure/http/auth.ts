import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";

/** Compara dos strings en tiempo constante para que la duración de la comparación
 * no filtre, byte a byte, cuánto del token adivinó un atacante. */
function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * Autenticación opcional por token fijo (bearer). Si no hay `token`, no registra nada:
 * el uso personal por Tailscale sigue sin fricción. Si lo hay, exige
 * `Authorization: Bearer <token>` en todas las rutas salvo `/health`.
 */
export function registerAuth(app: FastifyInstance, token: string | undefined): void {
  if (!token) return;

  app.addHook("onRequest", async (request, reply) => {
    if (request.url === "/health") return;
    if (!timingSafeStringEqual(request.headers.authorization ?? "", `Bearer ${token}`)) {
      reply.code(401).send({ error: "No autorizado" });
    }
  });
}
