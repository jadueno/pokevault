import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionToken, verifySessionToken } from "./sessionToken.js";

describe("createSessionToken / verifySessionToken", () => {
  it("un token recién creado es válido con el mismo secreto y lleva el id del usuario", () => {
    const token = createSessionToken("un-secreto-largo", "user-1");
    expect(verifySessionToken(token, "un-secreto-largo")).toEqual({ userId: "user-1" });
  });

  it("rechaza el token si se verifica con un secreto distinto", () => {
    const token = createSessionToken("un-secreto-largo", "user-1");
    expect(verifySessionToken(token, "otro-secreto")).toBeNull();
  });

  it("rechaza un token manipulado (firma ya no coincide con el contenido)", () => {
    const token = createSessionToken("un-secreto-largo", "user-1");
    const decoded = Buffer.from(token, "base64url").toString();
    const signature = decoded.slice(decoded.lastIndexOf(".") + 1);
    const tamperedPayload = JSON.stringify({ userId: "user-2", expiresAt: Date.now() + 999_999_999 });
    const tampered = Buffer.from(`${tamperedPayload}.${signature}`).toString("base64url");
    expect(verifySessionToken(tampered, "un-secreto-largo")).toBeNull();
  });

  it("rechaza texto que no tiene el formato de token", () => {
    expect(verifySessionToken("no-es-un-token-valido", "un-secreto-largo")).toBeNull();
  });

  describe("caducidad", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("caduca pasados 30 días", () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const token = createSessionToken("un-secreto-largo", "user-1");
      expect(verifySessionToken(token, "un-secreto-largo")).toEqual({ userId: "user-1" });

      vi.setSystemTime(new Date("2026-02-01T00:00:01Z")); // 31 días después
      expect(verifySessionToken(token, "un-secreto-largo")).toBeNull();
    });

    it("sigue siendo válido justo antes de caducar", () => {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const token = createSessionToken("un-secreto-largo", "user-1");

      vi.setSystemTime(new Date("2026-01-29T00:00:00Z")); // 28 días después, dentro de los 30
      expect(verifySessionToken(token, "un-secreto-largo")).toEqual({ userId: "user-1" });
    });
  });
});
