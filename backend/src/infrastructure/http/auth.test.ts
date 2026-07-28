import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import { registerAuth } from "./auth.js";
import { hashPassword } from "./passwordHash.js";

function buildTestApp(loginConfig: { username: string; passwordHash: string; sessionSecret: string } | undefined) {
  const app = Fastify({ logger: false });
  registerAuth(app, loginConfig);
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/protegido", async () => ({ ok: true }));
  return app;
}

describe("registerAuth", () => {
  it("sin login configurado, no exige ninguna cabecera (uso personal sin fricción)", async () => {
    const app = buildTestApp(undefined);
    const res = await app.inject({ method: "GET", url: "/protegido" });
    expect(res.statusCode).toBe(200);
  });

  it("/auth-config indica que no hace falta login cuando no está configurado", async () => {
    const app = buildTestApp(undefined);
    const res = await app.inject({ method: "GET", url: "/auth-config" });
    expect(res.json()).toEqual({ loginRequired: false });
  });

  it("/auth-config indica que hace falta login cuando está configurado", async () => {
    const app = buildTestApp({ username: "demo", passwordHash: hashPassword("demo-pass"), sessionSecret: "un-secreto" });
    const res = await app.inject({ method: "GET", url: "/auth-config" });
    expect(res.json()).toEqual({ loginRequired: true });
  });

  it("con login configurado, rechaza peticiones sin Authorization", async () => {
    const app = buildTestApp({ username: "demo", passwordHash: hashPassword("demo-pass"), sessionSecret: "un-secreto" });
    const res = await app.inject({ method: "GET", url: "/protegido" });
    expect(res.statusCode).toBe(401);
  });

  it("con login configurado, rechaza un token incorrecto", async () => {
    const app = buildTestApp({ username: "demo", passwordHash: hashPassword("demo-pass"), sessionSecret: "un-secreto" });
    const res = await app.inject({
      method: "GET",
      url: "/protegido",
      headers: { authorization: "Bearer incorrecto" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("POST /login devuelve un token válido con las credenciales correctas, que acepta las rutas protegidas", async () => {
    const app = buildTestApp({ username: "demo", passwordHash: hashPassword("demo-pass"), sessionSecret: "un-secreto" });
    const login = await app.inject({ method: "POST", url: "/login", payload: { username: "demo", password: "demo-pass" } });
    expect(login.statusCode).toBe(200);
    const { token } = login.json();

    const res = await app.inject({ method: "GET", url: "/protegido", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(200);
  });

  it("POST /login responde 401 con la contraseña incorrecta", async () => {
    const app = buildTestApp({ username: "demo", passwordHash: hashPassword("demo-pass"), sessionSecret: "un-secreto" });
    const res = await app.inject({ method: "POST", url: "/login", payload: { username: "demo", password: "mal" } });
    expect(res.statusCode).toBe(401);
  });

  it("POST /login responde 401 con el usuario incorrecto", async () => {
    const app = buildTestApp({ username: "demo", passwordHash: hashPassword("demo-pass"), sessionSecret: "un-secreto" });
    const res = await app.inject({ method: "POST", url: "/login", payload: { username: "otro", password: "demo-pass" } });
    expect(res.statusCode).toBe(401);
  });

  it("un token firmado con otro secreto se rechaza", async () => {
    const app = buildTestApp({ username: "demo", passwordHash: hashPassword("demo-pass"), sessionSecret: "un-secreto" });
    const otherApp = buildTestApp({ username: "demo", passwordHash: hashPassword("demo-pass"), sessionSecret: "otro-secreto-distinto" });

    const login = await otherApp.inject({ method: "POST", url: "/login", payload: { username: "demo", password: "demo-pass" } });
    const { token } = login.json();

    const res = await app.inject({ method: "GET", url: "/protegido", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(401);
  });

  it("/health nunca exige token, ni con login activado", async () => {
    const app = buildTestApp({ username: "demo", passwordHash: hashPassword("demo-pass"), sessionSecret: "un-secreto" });
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
  });
});
