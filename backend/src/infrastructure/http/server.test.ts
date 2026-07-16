import type { FastifyInstance } from "fastify";
import type { Pool } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPool, resetDatabase } from "../../test/testPool.js";
import { createFakeVisionProvider } from "../vision/fakeVisionProvider.js";
import { buildServer } from "./server.js";

let pool: Pool;
let app: FastifyInstance;

beforeAll(async () => {
  pool = createTestPool();
  app = await buildServer(pool, createFakeVisionProvider(), { logger: false });
});

afterEach(async () => {
  await resetDatabase(pool);
});

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe("GET /health", () => {
  it("responde ok sin autenticación", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok" });
  });
});

describe("/collection-items", () => {
  function payload(overrides: Record<string, unknown> = {}) {
    return {
      name: "Charizard",
      setName: "Base",
      number: "4",
      rarity: "Rare Holo",
      language: "es",
      condition: "near_mint",
      quantity: 1,
      acquisitionType: "purchased_single",
      sealedPurchaseId: null,
      purchasePrice: 25,
      purchaseCurrency: "EUR",
      purchaseDate: "2026-07-01",
      isGraded: false,
      gradingCompany: null,
      grade: null,
      estimatedValueOverride: null,
      estimatedValueOverrideAt: null,
      estimatedValueOverrideNote: null,
      notes: null,
      photo: null,
      ...overrides,
    };
  }

  it("crea, lista, actualiza y borra un ejemplar", async () => {
    const create = await app.inject({ method: "POST", url: "/collection-items", payload: payload() });
    expect(create.statusCode).toBe(201);
    const item = create.json();
    // Regresión: purchase_date se guardaba como "date" de Postgres, y al leerlo de
    // vuelta con `new Date(...).toISOString()` se desplazaba un día según la zona
    // horaria del proceso (España, UTC+1/+2) — "2026-07-01" volvía como "2026-06-30".
    expect(item.purchaseDate).toBe("2026-07-01");
    expect(item.name).toBe("Charizard");

    const list = await app.inject({ method: "GET", url: "/collection-items" });
    expect(list.json()).toHaveLength(1);

    const update = await app.inject({
      method: "PUT",
      url: `/collection-items/${item.id}`,
      payload: payload({ quantity: 2 }),
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().quantity).toBe(2);

    const remove = await app.inject({ method: "DELETE", url: `/collection-items/${item.id}` });
    expect(remove.statusCode).toBe(204);
    expect((await app.inject({ method: "GET", url: "/collection-items" })).json()).toEqual([]);
  });

  it("responde 400 con un idioma no reconocido", async () => {
    const res = await app.inject({ method: "POST", url: "/collection-items", payload: payload({ language: "klingon" }) });
    expect(res.statusCode).toBe(400);
  });

  it("GET /collection-items/summary suma valor estimado × cantidad, usando la corrección manual", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/collection-items",
      payload: payload({ quantity: 3, purchasePrice: 90 }),
    });
    await app.inject({
      method: "PUT",
      url: `/collection-items/${create.json().id}/estimated-value`,
      payload: { value: 100, note: "Estimado a mano" },
    });
    const summary = await app.inject({ method: "GET", url: "/collection-items/summary" });
    expect(summary.json().totalValue).toBe(300);
    expect(summary.json().totalInvested).toBe(270);
  });

  it("PUT /collection-items/:id/estimated-value marca la corrección manual", async () => {
    const create = await app.inject({ method: "POST", url: "/collection-items", payload: payload() });
    const res = await app.inject({
      method: "PUT",
      url: `/collection-items/${create.json().id}/estimated-value`,
      payload: { value: 200, note: "Visto en tienda" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().estimatedValueOverride).toBe(200);
  });
});

describe("/wishlist-items", () => {
  it("crea, lista y mueve un deseo a la colección", async () => {
    const create = await app.inject({
      method: "POST",
      url: "/wishlist-items",
      payload: { name: "Charizard", setName: "Base", priority: "high", maxPrice: 150, targetMonth: "2026-08", notes: null, photo: null },
    });
    expect(create.statusCode).toBe(201);

    const move = await app.inject({
      method: "POST",
      url: `/wishlist-items/${create.json().id}/move-to-collection`,
      payload: {
        language: "es",
        condition: "near_mint",
        quantity: 1,
        purchasePrice: 130,
        purchaseCurrency: "EUR",
        purchaseDate: "2026-08-05",
        notes: null,
      },
    });
    expect(move.statusCode).toBe(201);
    expect(move.json().name).toBe("Charizard");
    expect((await app.inject({ method: "GET", url: "/wishlist-items" })).json()).toEqual([]);
    expect((await app.inject({ method: "GET", url: "/collection-items" })).json()).toHaveLength(1);
  });

  it("responde 400 con un mes objetivo mal formado", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/wishlist-items",
      payload: { name: "Charizard", setName: null, priority: "medium", maxPrice: null, targetMonth: "agosto", notes: null, photo: null },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("/sealed-purchases", () => {
  it("crea, lista, actualiza y borra una compra de sellado", async () => {
    const payload = {
      productName: "Sobre Evoluciones Prismáticas",
      productType: "booster_pack",
      quantity: 3,
      purchasePrice: 5.5,
      purchaseCurrency: "EUR",
      purchaseDate: "2026-07-01",
      estimatedValueOverride: null,
      estimatedValueOverrideAt: null,
      estimatedValueOverrideNote: null,
      location: "Cajón del salón",
      notes: null,
      photo: null,
    };
    const create = await app.inject({ method: "POST", url: "/sealed-purchases", payload });
    expect(create.statusCode).toBe(201);

    const list = await app.inject({ method: "GET", url: "/sealed-purchases" });
    expect(list.json()).toHaveLength(1);

    const override = await app.inject({
      method: "PUT",
      url: `/sealed-purchases/${create.json().id}/estimated-value`,
      payload: { value: 8, note: "Precio actual en tienda" },
    });
    expect(override.statusCode).toBe(200);
    expect(override.json().estimatedValueOverride).toBe(8);

    const remove = await app.inject({ method: "DELETE", url: `/sealed-purchases/${create.json().id}` });
    expect(remove.statusCode).toBe(204);
  });
});

describe("/plan-items", () => {
  it("crea, lista, marca como hecho y borra un ítem del plan, sin tocar la colección", async () => {
    const payload = { month: "2026-08", category: "comprar", description: "1x ETB Megaevolución (ES)", done: false, position: 0 };
    const create = await app.inject({ method: "POST", url: "/plan-items", payload });
    expect(create.statusCode).toBe(201);
    expect(create.json().done).toBe(false);

    const list = await app.inject({ method: "GET", url: "/plan-items" });
    expect(list.json()).toHaveLength(1);

    const toggle = await app.inject({ method: "POST", url: `/plan-items/${create.json().id}/toggle-done` });
    expect(toggle.statusCode).toBe(200);
    expect(toggle.json().done).toBe(true);

    // "hecho" en el plan es independiente de "Ya la tengo": no debe aparecer nada en la colección.
    expect((await app.inject({ method: "GET", url: "/collection-items" })).json()).toEqual([]);

    const remove = await app.inject({ method: "DELETE", url: `/plan-items/${create.json().id}` });
    expect(remove.statusCode).toBe(204);
  });

  it("responde 400 con un mes mal formado o una categoría no reconocida", async () => {
    const badMonth = await app.inject({
      method: "POST",
      url: "/plan-items",
      payload: { month: "agosto-2026", category: "comprar", description: "Algo", done: false, position: 0 },
    });
    expect(badMonth.statusCode).toBe(400);

    const badCategory = await app.inject({
      method: "POST",
      url: "/plan-items",
      payload: { month: "2026-08", category: "vender", description: "Algo", done: false, position: 0 },
    });
    expect(badCategory.statusCode).toBe(400);
  });
});

describe("/plan-settings", () => {
  it("lee y actualiza el presupuesto mensual y las notas del plan", async () => {
    const get = await app.inject({ method: "GET", url: "/plan-settings" });
    expect(get.statusCode).toBe(200);

    const update = await app.inject({
      method: "PUT",
      url: "/plan-settings",
      payload: {
        monthlyBudget: 200,
        yearRules: "Regla nueva",
        yearGoal: "Objetivo nuevo",
        shoppingLinks: [{ label: "Cardmarket", url: "https://www.cardmarket.com" }],
      },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().monthlyBudget).toBe(200);
    expect(update.json().shoppingLinks).toEqual([{ label: "Cardmarket", url: "https://www.cardmarket.com" }]);
  });

  it("responde 400 con un presupuesto negativo", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/plan-settings",
      payload: { monthlyBudget: -10, yearRules: null, yearGoal: null, shoppingLinks: [] },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("/card-recognition", () => {
  it("devuelve los datos reconocidos por el proveedor de visión (fake en tests)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/card-recognition",
      payload: { imageDataUrl: "data:image/jpeg;base64,AAAA" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ name: "Charizard", setName: "Base", number: "4/102", rarity: "Rare Holo", confidence: "high" });
  });

  it("responde 400 si la foto no es una data URL de imagen", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/card-recognition",
      payload: { imageDataUrl: "https://ejemplo.com/foto.jpg" },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("autenticación opcional (API_TOKEN), de extremo a extremo con el servidor real", () => {
  it("con apiToken configurado, exige el token también en las rutas ya montadas", async () => {
    const authedApp = await buildServer(pool, createFakeVisionProvider(), { logger: false, apiToken: "demo-token" });

    const withoutToken = await authedApp.inject({ method: "GET", url: "/collection-items" });
    expect(withoutToken.statusCode).toBe(401);

    const health = await authedApp.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);

    const withToken = await authedApp.inject({
      method: "GET",
      url: "/collection-items",
      headers: { authorization: "Bearer demo-token" },
    });
    expect(withToken.statusCode).toBe(200);

    await authedApp.close();
  });
});
