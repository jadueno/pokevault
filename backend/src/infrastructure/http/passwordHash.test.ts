import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwordHash.js";

describe("hashPassword / verifyPassword", () => {
  it("verifica correctamente una contraseña frente a su propio hash", () => {
    const hash = hashPassword("mi-contraseña-secreta");
    expect(verifyPassword("mi-contraseña-secreta", hash)).toBe(true);
  });

  it("rechaza una contraseña incorrecta", () => {
    const hash = hashPassword("mi-contraseña-secreta");
    expect(verifyPassword("otra-contraseña", hash)).toBe(false);
  });

  it("genera un hash distinto cada vez (salt aleatorio), aunque la contraseña sea la misma", () => {
    const hashA = hashPassword("misma-contraseña");
    const hashB = hashPassword("misma-contraseña");
    expect(hashA).not.toBe(hashB);
    expect(verifyPassword("misma-contraseña", hashA)).toBe(true);
    expect(verifyPassword("misma-contraseña", hashB)).toBe(true);
  });

  it("rechaza un hash con formato inválido (sin el separador salt:hash) en vez de lanzar", () => {
    expect(verifyPassword("cualquiera", "sin-separador")).toBe(false);
  });
});
