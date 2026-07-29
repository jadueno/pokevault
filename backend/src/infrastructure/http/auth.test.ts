import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerAuth } from "./auth.js";
import { hashPassword } from "./passwordHash.js";
import type { UserRepository } from "../../domain/ports.js";

const DEMO_USER = { id: "user-demo", email: "demo@example.com", passwordHash: hashPassword("demo-pass") };

function stubUserRepository(users: { id: string; email: string; passwordHash: string }[] = [DEMO_USER]): UserRepository {
  return {
    async findByEmail(email: string) {
      return users.find((u) => u.email === email) ?? null;
    },
  };
}

function buildTestApp(sessionSecret = "un-secreto", userRepository: UserRepository = stubUserRepository()) {
  const app = Fastify({ logger: false });
  registerAuth(app, userRepository, { sessionSecret });
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/protegido", async (request) => ({ ok: true, userId: request.userId }));
  return app;
}

describe("registerAuth", () => {
  it("/auth-config siempre indica que hace falta login (ya no es opcional)", async () => {
    const app = buildTestApp();
    const res = await app.inject({ method: "GET", url: "/auth-config" });
    expect(res.json()).toEqual({ loginRequired: true });
  });

  it("rechaza peticiones sin Authorization", async () => {
    const app = buildTestApp();
    const res = await app.inject({ method: "GET", url: "/protegido" });
    expect(res.statusCode).toBe(401);
  });

  it("rechaza un token incorrecto", async () => {
    const app = buildTestApp();
    const res = await app.inject({ method: "GET", url: "/protegido", headers: { authorization: "Bearer incorrecto" } });
    expect(res.statusCode).toBe(401);
  });

  it("POST /login devuelve un token válido con las credenciales correctas, que acepta las rutas protegidas y decora request.userId", async () => {
    const app = buildTestApp();
    const login = await app.inject({ method: "POST", url: "/login", payload: { email: "demo@example.com", password: "demo-pass" } });
    expect(login.statusCode).toBe(200);
    const { token } = login.json();

    const res = await app.inject({ method: "GET", url: "/protegido", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, userId: DEMO_USER.id });
  });

  it("POST /login responde 401 con la contraseña incorrecta", async () => {
    const app = buildTestApp();
    const res = await app.inject({ method: "POST", url: "/login", payload: { email: "demo@example.com", password: "mal" } });
    expect(res.statusCode).toBe(401);
  });

  it("POST /login responde 401 con un email que no existe", async () => {
    const app = buildTestApp();
    const res = await app.inject({ method: "POST", url: "/login", payload: { email: "otro@example.com", password: "demo-pass" } });
    expect(res.statusCode).toBe(401);
  });

  it("un token firmado con otro secreto se rechaza", async () => {
    const app = buildTestApp("un-secreto");
    const otherApp = buildTestApp("otro-secreto-distinto");

    const login = await otherApp.inject({ method: "POST", url: "/login", payload: { email: "demo@example.com", password: "demo-pass" } });
    const { token } = login.json();

    const res = await app.inject({ method: "GET", url: "/protegido", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(401);
  });

  it("/health nunca exige token", async () => {
    const app = buildTestApp();
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });
});
