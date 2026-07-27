import { timingSafeEqual } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { verifyPassword } from "./passwordHash.js";
import { createSessionToken, verifySessionToken } from "./sessionToken.js";

/** Compara dos strings en tiempo constante para que la duración de la comparación
 * no filtre, byte a byte, cuánto de un valor secreto adivinó un atacante. */
function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export interface LoginConfig {
  username: string;
  /** Hash con scrypt, formato "salt:hash" — ver passwordHash.ts. Nunca la contraseña en claro. */
  passwordHash: string;
  sessionSecret: string;
}

const PUBLIC_PATHS = new Set(["/health", "/login", "/auth-config"]);

/**
 * Login opcional (usuario + contraseña -> token de sesión firmado, sin estado en el
 * servidor). Si no hay `loginConfig`, no exige nada: el uso personal local sigue sin
 * fricción (mismo criterio que el token fijo que sustituye). Si lo hay, exige un token de
 * sesión válido (`Authorization: Bearer <token>`) en todas las rutas salvo /health,
 * /login y /auth-config (esta última para que el frontend sepa si debe mostrar el login
 * antes de intentar nada, sin necesitar credenciales para preguntarlo).
 */
export function registerAuth(app: FastifyInstance, loginConfig: LoginConfig | undefined): void {
  app.get("/auth-config", async () => ({ loginRequired: !!loginConfig }));

  if (!loginConfig) return;

  app.post("/login", async (request, reply) => {
    const { username, password } = (request.body ?? {}) as { username?: string; password?: string };
    const validUsername = timingSafeStringEqual(username ?? "", loginConfig.username);
    const validPassword = !!password && verifyPassword(password, loginConfig.passwordHash);
    if (!validUsername || !validPassword) {
      reply.code(401).send({ error: "Usuario o contraseña incorrectos" });
      return;
    }
    reply.send({ token: createSessionToken(loginConfig.sessionSecret) });
  });

  app.addHook("onRequest", async (request, reply) => {
    if (PUBLIC_PATHS.has(request.url.split("?")[0])) return;
    const header = request.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token || !verifySessionToken(token, loginConfig.sessionSecret)) {
      reply.code(401).send({ error: "No autorizado" });
    }
  });
}
