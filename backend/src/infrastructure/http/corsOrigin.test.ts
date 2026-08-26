import { describe, expect, it } from "vitest";
import { createOriginChecker } from "./corsOrigin.js";

function check(isDeployed: boolean, origin: string | undefined): Promise<boolean> {
  return new Promise((resolve) => {
    createOriginChecker(isDeployed)(origin, (err, allow) => {
      resolve(!err && allow);
    });
  });
}

describe("createOriginChecker", () => {
  it("permite peticiones sin cabecera Origin (curl, servidor a servidor), en ambos modos", async () => {
    expect(await check(true, undefined)).toBe(true);
    expect(await check(false, undefined)).toBe(true);
  });

  it("permite el dominio de producción, en ambos modos", async () => {
    expect(await check(true, "https://pokevault.jadueno.com")).toBe(true);
    expect(await check(false, "https://pokevault.jadueno.com")).toBe(true);
  });

  it("rechaza una web pública cualquiera, en ambos modos", async () => {
    expect(await check(true, "https://evil.example.com")).toBe(false);
    expect(await check(false, "https://evil.example.com")).toBe(false);
  });

  it("rechaza un origen que casi parece de producción pero no lo es, en ambos modos", async () => {
    expect(await check(true, "https://pokevault.jadueno.com.evil.com")).toBe(false);
    expect(await check(false, "https://pokevault.jadueno.com.evil.com")).toBe(false);
  });

  describe("modo desplegado (isDeployed: true)", () => {
    it("rechaza localhost/LAN/Tailscale — la VPS nunca se ve a sí misma desde esas redes", async () => {
      expect(await check(true, "http://localhost:5186")).toBe(false);
      expect(await check(true, "http://192.168.1.42:5186")).toBe(false);
      expect(await check(true, "http://100.94.12.3:5186")).toBe(false);
    });
  });

  describe("modo local (isDeployed: false)", () => {
    it("permite localhost en cualquier puerto", async () => {
      expect(await check(false, "http://localhost:5186")).toBe(true);
      expect(await check(false, "http://127.0.0.1:5186")).toBe(true);
    });

    it("permite una IP de LAN (192.168.x.x)", async () => {
      expect(await check(false, "http://192.168.1.42:5186")).toBe(true);
    });

    it("permite una IP de Tailscale (100.64.0.0/10)", async () => {
      expect(await check(false, "http://100.94.12.3:5186")).toBe(true);
    });

    it("rechaza una IP pública fuera de los rangos privados", async () => {
      expect(await check(false, "http://8.8.8.8:5186")).toBe(false);
    });
  });
});
