import { beforeEach, describe, expect, it } from "vitest";
import { clearStoredToken, getStoredToken, setStoredToken } from "./auth";

const TOKEN_KEY = "pokevault_session_token";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("setStoredToken / getStoredToken", () => {
  it("con remember=true, guarda en localStorage y sobrevive a un sessionStorage vacío", () => {
    setStoredToken("token-abc", true);

    expect(localStorage.getItem(TOKEN_KEY)).toBe("token-abc");
    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(getStoredToken()).toBe("token-abc");
  });

  it("con remember=false, guarda solo en sessionStorage", () => {
    setStoredToken("token-abc", false);

    expect(sessionStorage.getItem(TOKEN_KEY)).toBe("token-abc");
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(getStoredToken()).toBe("token-abc");
  });

  it("un login sin recordar borra un token recordado anterior, y viceversa", () => {
    setStoredToken("recordado", true);
    setStoredToken("solo-sesion", false);

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(sessionStorage.getItem(TOKEN_KEY)).toBe("solo-sesion");

    setStoredToken("recordado-otra-vez", true);

    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(TOKEN_KEY)).toBe("recordado-otra-vez");
  });

  it("sin token guardado, devuelve null", () => {
    expect(getStoredToken()).toBeNull();
  });
});

describe("clearStoredToken", () => {
  it("borra el token de las dos storages", () => {
    setStoredToken("a", true);
    setStoredToken("b", false);

    clearStoredToken();

    expect(getStoredToken()).toBeNull();
  });
});
