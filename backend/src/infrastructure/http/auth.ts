import type { FastifyInstance } from "fastify";
import { verifyPassword } from "./passwordHash.js";
import { createSessionToken, verifySessionToken } from "./sessionToken.js";
import type { UserRepository } from "../../domain/ports.js";

declare module "fastify" {
  interface FastifyRequest {
    /** Id del usuario autenticado — decorado tras verificar el token, disponible en todas
     * las rutas salvo las de PUBLIC_PATHS. */
    userId: string;
  }
}

export interface AuthConfig {
  sessionSecret: string;
}

const PUBLIC_PATHS = new Set(["/health", "/login", "/auth-config"]);

/**
 * Login obligatorio (email + contraseña -> token de sesión firmado, sin estado en el
 * servidor, con el id del usuario dentro). A diferencia de la versión de un solo usuario
 * de antes, ya no hay modo "sin login": con datos por usuario, cada petición necesita
 * saber de quién es. Exige un token de sesión válido (`Authorization: Bearer <token>`) en
 * todas las rutas salvo /health, /login y /auth-config (esta última para que el frontend
 * sepa si debe mostrar el login antes de intentar nada, sin necesitar credenciales para
 * preguntarlo — siempre responde `loginRequired: true` ahora).
 */
export function registerAuth(app: FastifyInstance, userRepository: UserRepository, config: AuthConfig): void {
  app.get("/auth-config", async () => ({ loginRequired: true }));

  // Límite propio, mucho más estricto que el general de la API (pensado para uso normal
  // de CRUD): /login es lo único que un atacante externo puede intentar sin sesión, así
  // que merece frenar la fuerza bruta por separado en vez de heredar el límite genérico.
  app.post("/login", { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (request, reply) => {
    const { email, password } = (request.body ?? {}) as { email?: string; password?: string };
    const user = email ? await userRepository.findByEmail(email) : null;
    const validPassword = !!user && !!password && verifyPassword(password, user.passwordHash);
    if (!user || !validPassword) {
      reply.code(401).send({ error: "Email o contraseña incorrectos" });
      return;
    }
    reply.send({ token: createSessionToken(config.sessionSecret, user.id) });
  });

  app.decorateRequest("userId", "");

  app.addHook("onRequest", async (request, reply) => {
    if (PUBLIC_PATHS.has(request.url.split("?")[0])) return;
    const header = request.headers.authorization ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const verified = token ? verifySessionToken(token, config.sessionSecret) : null;
    if (!verified) {
      reply.code(401).send({ error: "No autorizado" });
      return;
    }
    request.userId = verified.userId;
  });
}
