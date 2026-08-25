import { describe, expect, it } from "vitest";
import { isAllowedOrigin } from "./corsOrigin.js";

function check(origin: string | undefined): Promise<boolean> {
  return new Promise((resolve) => {
    isAllowedOrigin(origin, (err, allow) => {
      resolve(!err && allow);
    });
  });
}

describe("isAllowedOrigin", () => {
  it("permite peticiones sin cabecera Origin (curl, servidor a servidor)", async () => {
    expect(await check(undefined)).toBe(true);
  });

  it("permite el dominio de producción", async () => {
    expect(await check("https://pokevault.jadueno.com")).toBe(true);
  });

  it("permite localhost en cualquier puerto", async () => {
    expect(await check("http://localhost:5186")).toBe(true);
    expect(await check("http://127.0.0.1:5186")).toBe(true);
  });

  it("permite una IP de LAN (192.168.x.x)", async () => {
    expect(await check("http://192.168.1.42:5186")).toBe(true);
  });

  it("permite una IP de Tailscale (100.64.0.0/10)", async () => {
    expect(await check("http://100.94.12.3:5186")).toBe(true);
  });

  it("rechaza una web publica cualquiera", async () => {
    expect(await check("https://evil.example.com")).toBe(false);
  });

  it("rechaza un origen que casi parece de produccion pero no lo es", async () => {
    expect(await check("https://pokevault.jadueno.com.evil.com")).toBe(false);
  });

  it("rechaza una IP publica fuera de los rangos privados", async () => {
    expect(await check("http://8.8.8.8:5186")).toBe(false);
  });
});
