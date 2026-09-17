import type { FastifyInstance, InjectOptions } from "fastify";
import type { Pool } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createTestPool, resetDatabase } from "../../test/testPool.js";
import { createFakePokemonTcgProvider } from "../catalog/fakePokemonTcgProvider.js";
import { hashPassword } from "./passwordHash.js";
import { buildServer } from "./server.js";

let pool: Pool;
let app: FastifyInstance;
let authHeader: { authorization: string };
let userId: string;

/** Cabecera de autenticación ya adjunta — el login es obligatorio en todas las rutas
 * salvo /health, /login y /auth-config (ver auth.ts), así que la práctica totalidad de
 * este fichero necesita un token válido. */
function injectAuthed(opts: InjectOptions) {
  return app.inject({ ...opts, headers: { ...authHeader, ...opts.headers } });
}

beforeAll(async () => {
  pool = createTestPool();
  app = await buildServer(pool, createFakePokemonTcgProvider(), { logger: false, sessionSecret: "un-secreto" });

  const {
    rows: [user],
  } = await pool.query<{ id: string }>("insert into users (email, password_hash) values ($1, $2) returning id", [
    "demo@example.com",
    hashPassword("demo-pass"),
  ]);
  userId = user.id;

  const login = await app.inject({ method: "POST", url: "/login", payload: { email: "demo@example.com", password: "demo-pass" } });
  const { token } = login.json();
  authHeader = { authorization: `Bearer ${token}` };
});

afterEach(async () => {
  await resetDatabase(pool);
});

afterAll(async () => {
  // resetDatabase (afterEach) no toca "users" a propósito — este usuario fijo se
  // reutiliza en todos los tests del fichero — así que hay que borrarlo aquí a mano:
  // si no, sobrevive a esta ejecución y la siguiente vez que corras la suite, el insert
  // de arriba choca con la fila ya existente ("duplicate key value violates unique
  // constraint users_email_key").
  await pool.query("delete from users where id = $1", [userId]);
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
      variant: "normal",
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
    const create = await injectAuthed({ method: "POST", url: "/collection-items", payload: payload() });
    expect(create.statusCode).toBe(201);
    const item = create.json();
    // Regresión: purchase_date se guardaba como "date" de Postgres, y al leerlo de
    // vuelta con `new Date(...).toISOString()` se desplazaba un día según la zona
    // horaria del proceso (España, UTC+1/+2) — "2026-07-01" volvía como "2026-06-30".
    expect(item.purchaseDate).toBe("2026-07-01");
    expect(item.name).toBe("Charizard");

    const list = await injectAuthed({ method: "GET", url: "/collection-items" });
    expect(list.json()).toHaveLength(1);

    const update = await injectAuthed({
      method: "PUT",
      url: `/collection-items/${item.id}`,
      payload: payload({ quantity: 2 }),
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().quantity).toBe(2);

    const remove = await injectAuthed({ method: "DELETE", url: `/collection-items/${item.id}` });
    expect(remove.statusCode).toBe(204);
    expect((await injectAuthed({ method: "GET", url: "/collection-items" })).json()).toEqual([]);
  });

  it("responde 400 con un idioma no reconocido", async () => {
    const res = await injectAuthed({ method: "POST", url: "/collection-items", payload: payload({ language: "klingon" }) });
    expect(res.statusCode).toBe(400);
  });

  it("GET /collection-items/summary suma valor estimado × cantidad, usando la corrección manual", async () => {
    const create = await injectAuthed({
      method: "POST",
      url: "/collection-items",
      payload: payload({ quantity: 3, purchasePrice: 90 }),
    });
    await injectAuthed({
      method: "PUT",
      url: `/collection-items/${create.json().id}/estimated-value`,
      payload: { value: 100, note: "Estimado a mano" },
    });
    const summary = await injectAuthed({ method: "GET", url: "/collection-items/summary" });
    expect(summary.json().totalValue).toBe(300);
    expect(summary.json().totalInvested).toBe(270);
  });

  it("PUT /collection-items/:id/estimated-value marca la corrección manual", async () => {
    const create = await injectAuthed({ method: "POST", url: "/collection-items", payload: payload() });
    const res = await injectAuthed({
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
    const create = await injectAuthed({
      method: "POST",
      url: "/wishlist-items",
      payload: { name: "Charizard", setName: "Base", priority: "high", maxPrice: 150, targetMonth: "2026-08", notes: null, photo: null },
    });
    expect(create.statusCode).toBe(201);

    const move = await injectAuthed({
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
    expect((await injectAuthed({ method: "GET", url: "/wishlist-items" })).json()).toEqual([]);
    expect((await injectAuthed({ method: "GET", url: "/collection-items" })).json()).toHaveLength(1);
  });

  it("responde 400 con un mes objetivo mal formado", async () => {
    const res = await injectAuthed({
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
    const create = await injectAuthed({ method: "POST", url: "/sealed-purchases", payload });
    expect(create.statusCode).toBe(201);

    const list = await injectAuthed({ method: "GET", url: "/sealed-purchases" });
    expect(list.json()).toHaveLength(1);

    const override = await injectAuthed({
      method: "PUT",
      url: `/sealed-purchases/${create.json().id}/estimated-value`,
      payload: { value: 8, note: "Precio actual en tienda" },
    });
    expect(override.statusCode).toBe(200);
    expect(override.json().estimatedValueOverride).toBe(8);

    const remove = await injectAuthed({ method: "DELETE", url: `/sealed-purchases/${create.json().id}` });
    expect(remove.statusCode).toBe(204);
  });
});

describe("/plan-items", () => {
  it("crea, lista, marca como hecho y borra un ítem del plan, sin tocar la colección", async () => {
    const payload = {
      month: "2026-08",
      category: "comprar",
      description: "1x ETB Megaevolución (ES)",
      referencePrice: 59,
      searchTerm: "ETB Megaevolución Español",
      done: false,
      position: 0,
    };
    const create = await injectAuthed({ method: "POST", url: "/plan-items", payload });
    expect(create.statusCode).toBe(201);
    expect(create.json().done).toBe(false);
    expect(create.json().referencePrice).toBe(59);
    expect(create.json().searchTerm).toBe("ETB Megaevolución Español");

    const list = await injectAuthed({ method: "GET", url: "/plan-items" });
    expect(list.json()).toHaveLength(1);

    const toggle = await injectAuthed({ method: "POST", url: `/plan-items/${create.json().id}/toggle-done` });
    expect(toggle.statusCode).toBe(200);
    expect(toggle.json().done).toBe(true);

    // "hecho" en el plan es independiente de "Ya la tengo": no debe aparecer nada en la colección.
    expect((await injectAuthed({ method: "GET", url: "/collection-items" })).json()).toEqual([]);

    const remove = await injectAuthed({ method: "DELETE", url: `/plan-items/${create.json().id}` });
    expect(remove.statusCode).toBe(204);
  });

  it("responde 400 con un mes mal formado o una categoría no reconocida", async () => {
    const badMonth = await injectAuthed({
      method: "POST",
      url: "/plan-items",
      payload: {
        month: "agosto-2026",
        category: "comprar",
        description: "Algo",
        referencePrice: null,
        searchTerm: null,
        done: false,
        position: 0,
      },
    });
    expect(badMonth.statusCode).toBe(400);

    const badCategory = await injectAuthed({
      method: "POST",
      url: "/plan-items",
      payload: {
        month: "2026-08",
        category: "vender",
        description: "Algo",
        referencePrice: null,
        searchTerm: null,
        done: false,
        position: 0,
      },
    });
    expect(badCategory.statusCode).toBe(400);
  });

  it("countedElsewhere se guarda a false por defecto si no se envía, y se puede activar/leer", async () => {
    const payload = { month: "2026-09", category: "comprar", description: "ETB ya registrada en Sellado", referencePrice: 55.9, searchTerm: null, done: true, position: 0 };
    const create = await injectAuthed({ method: "POST", url: "/plan-items", payload });
    const created = create.json();
    expect(created.countedElsewhere).toBe(false);

    const update = await injectAuthed({
      method: "PUT",
      url: `/plan-items/${created.id}`,
      payload: { ...payload, countedElsewhere: true },
    });
    expect(update.statusCode).toBe(200);
    expect(update.json().countedElsewhere).toBe(true);

    const list = await injectAuthed({ method: "GET", url: "/plan-items" });
    expect(list.json()[0].countedElsewhere).toBe(true);
  });

  it("responde 400 con un precio de referencia negativo", async () => {
    const res = await injectAuthed({
      method: "POST",
      url: "/plan-items",
      payload: {
        month: "2026-08",
        category: "comprar",
        description: "Algo",
        referencePrice: -10,
        searchTerm: null,
        done: false,
        position: 0,
      },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("/plan-settings", () => {
  it("lee y actualiza el presupuesto mensual y las notas del plan", async () => {
    const get = await injectAuthed({ method: "GET", url: "/plan-settings" });
    expect(get.statusCode).toBe(200);

    const update = await injectAuthed({
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
    const res = await injectAuthed({
      method: "PUT",
      url: "/plan-settings",
      payload: { monthlyBudget: -10, yearRules: null, yearGoal: null, shoppingLinks: [] },
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("/set-checklists", () => {
  // Para los tests de lectura (list/cards) se sigue sembrando directamente en la base de
  // datos — más simple que pasar por el flujo de búsqueda+sincronización del fake.
  async function seedChecklist() {
    const {
      rows: [catalog],
    } = await pool.query<{ id: string }>(
      `insert into set_catalogs (external_set_id, set_name, total_cards) values ('me5', 'Pitch Black', 2) returning id`,
    );
    await pool.query(
      `insert into set_catalog_cards (catalog_id, number, name, rarity, image_url) values
         ($1, '1', 'Tropius', 'Common', null),
         ($1, '2', 'Grubbin', 'Common', null)`,
      [catalog.id],
    );
    const {
      rows: [checklist],
    } = await pool.query<{ id: string }>(
      `insert into set_checklists (user_id, catalog_id, set_name_es) values ($1, $2, 'Oscuridad Absoluta') returning id`,
      [userId, catalog.id],
    );
    return checklist.id;
  }

  it("lista los checklists sincronizados", async () => {
    await seedChecklist();
    const res = await injectAuthed({ method: "GET", url: "/set-checklists" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      expect.objectContaining({ externalSetId: "me5", setName: "Pitch Black", setNameEs: "Oscuridad Absoluta", totalCards: 2 }),
    ]);
  });

  it("devuelve las cartas de un checklist ordenadas por número", async () => {
    const checklistId = await seedChecklist();
    const res = await injectAuthed({ method: "GET", url: `/set-checklists/${checklistId}/cards` });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      expect.objectContaining({ number: "1", name: "Tropius" }),
      expect.objectContaining({ number: "2", name: "Grubbin" }),
    ]);
  });

  it("con un checklist sin cartas, devuelve una lista vacía", async () => {
    const res = await injectAuthed({ method: "GET", url: "/set-checklists/00000000-0000-0000-0000-000000000000/cards" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("GET /set-search devuelve los candidatos que encuentra el proveedor (fake en tests)", async () => {
    const res = await injectAuthed({ method: "GET", url: "/set-search?q=Test Set" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([{ externalSetId: "ts1", name: "Test Set", totalCards: 2, releaseDate: "2026/01/01" }]);
  });

  it("POST /set-checklists sincroniza el set elegido, con precio de referencia incluido", async () => {
    const res = await injectAuthed({
      method: "POST",
      url: "/set-checklists",
      payload: { externalSetId: "ts1", setNameEs: "Set de Prueba" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ externalSetId: "ts1", setNameEs: "Set de Prueba", totalCards: 2 });

    const cards = await injectAuthed({ method: "GET", url: `/set-checklists/${res.json().id}/cards` });
    expect(cards.json()).toEqual([
      expect.objectContaining({ number: "1", name: "Fake Pikachu", referencePrice: 1.5 }),
      expect.objectContaining({ number: "2", name: "Fake Charizard", referencePrice: null }),
    ]);
  });

  it("POST /set-checklists responde 404 si ya estaba sincronizado", async () => {
    await injectAuthed({ method: "POST", url: "/set-checklists", payload: { externalSetId: "ts1", setNameEs: null } });
    const res = await injectAuthed({ method: "POST", url: "/set-checklists", payload: { externalSetId: "ts1", setNameEs: null } });
    expect(res.statusCode).toBe(404);
  });

  it("POST /set-checklists/:id/resync vuelve a traer las cartas del mismo set", async () => {
    const sync = await injectAuthed({ method: "POST", url: "/set-checklists", payload: { externalSetId: "ts1", setNameEs: null } });
    const res = await injectAuthed({ method: "POST", url: `/set-checklists/${sync.json().id}/resync` });
    expect(res.statusCode).toBe(200);
    expect(res.json().externalSetId).toBe("ts1");
  });

  it("POST /set-checklists/:id/resync responde 404 si el checklist no existe", async () => {
    const res = await injectAuthed({ method: "POST", url: "/set-checklists/00000000-0000-0000-0000-000000000000/resync" });
    expect(res.statusCode).toBe(404);
  });

  it("POST /set-checklists/binder crea un binder con las cartas de los Pokémon indicados, de expansiones distintas", async () => {
    const res = await injectAuthed({
      method: "POST",
      url: "/set-checklists/binder",
      payload: { title: "Slowpoke y Slowbro", pokemonNames: ["Slowpoke", "Slowbro"] },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({
      setNameEs: "Slowpoke y Slowbro",
      kind: "binder",
      pokemonNames: ["Slowpoke", "Slowbro"],
      totalCards: 3,
    });

    const cards = await injectAuthed({ method: "GET", url: `/set-checklists/${res.json().id}/cards` });
    expect(cards.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Fake Slowpoke", setName: "Test Set" }),
        expect.objectContaining({ name: "Fake Slowpoke", setName: "Otro Set de Prueba" }),
        expect.objectContaining({ name: "Fake Slowbro", setName: "Test Set" }),
      ]),
    );
  });

  it("POST /set-checklists/binder responde 404 si ya existe un binder con esos mismos Pokémon", async () => {
    await injectAuthed({ method: "POST", url: "/set-checklists/binder", payload: { title: "A", pokemonNames: ["Slowpoke"] } });
    const res = await injectAuthed({ method: "POST", url: "/set-checklists/binder", payload: { title: "B", pokemonNames: ["Slowpoke"] } });
    expect(res.statusCode).toBe(404);
  });

  it("POST /set-checklists/binder responde 400 si no se indica ningún Pokémon", async () => {
    const res = await injectAuthed({ method: "POST", url: "/set-checklists/binder", payload: { title: "Vacío", pokemonNames: [] } });
    expect(res.statusCode).toBe(400);
  });

  it("dos usuarios sincronizando el mismo set comparten un único catálogo, sin duplicar sus cartas", async () => {
    const {
      rows: [otherUser],
    } = await pool.query<{ id: string }>("insert into users (email, password_hash) values ($1, $2) returning id", [
      "otro@example.com",
      hashPassword("otro-pass"),
    ]);
    const login = await app.inject({ method: "POST", url: "/login", payload: { email: "otro@example.com", password: "otro-pass" } });
    const otherHeader = { authorization: `Bearer ${login.json().token}` };

    const first = await injectAuthed({ method: "POST", url: "/set-checklists", payload: { externalSetId: "ts1", setNameEs: "Alias A" } });
    const second = await app.inject({
      method: "POST",
      url: "/set-checklists",
      headers: otherHeader,
      payload: { externalSetId: "ts1", setNameEs: "Alias B" },
    });
    expect(first.statusCode).toBe(201);
    expect(second.statusCode).toBe(201);
    expect(first.json().id).not.toBe(second.json().id);

    const { rows: catalogRows } = await pool.query("select count(*) from set_catalogs where external_set_id = 'ts1'");
    expect(Number(catalogRows[0].count)).toBe(1);

    const { rows: cardRows } = await pool.query(
      "select count(*) from set_catalog_cards cc join set_catalogs c on c.id = cc.catalog_id where c.external_set_id = 'ts1'",
    );
    expect(Number(cardRows[0].count)).toBe(2);

    await pool.query("delete from users where id = $1", [otherUser.id]);
  });
});

describe("/card-search", () => {
  it("con un nombre sin ambigüedad, devuelve un único candidato", async () => {
    const res = await injectAuthed({ method: "GET", url: "/card-search?name=pikachu" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([
      expect.objectContaining({ name: "Fake Pikachu", setName: "Test Set", number: "1/2", variant: "normal" }),
    ]);
  });

  it("con un nombre ambiguo (varias expansiones), devuelve todos los candidatos", async () => {
    const res = await injectAuthed({ method: "GET", url: "/card-search?name=charizard" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body).toHaveLength(2);
    expect(body.map((c: { setName: string }) => c.setName)).toEqual(["Test Set", "Otro Set de Prueba"]);
  });

  it("sin coincidencias, devuelve una lista vacía", async () => {
    const res = await injectAuthed({ method: "GET", url: "/card-search?name=no-existe-esta-carta" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual([]);
  });

  it("responde 400 si el nombre viene vacío", async () => {
    const res = await injectAuthed({ method: "GET", url: "/card-search?name=" });
    expect(res.statusCode).toBe(400);
  });
});

describe("/auth-config", () => {
  it("siempre indica que hace falta login (ya no es opcional)", async () => {
    const res = await app.inject({ method: "GET", url: "/auth-config" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ loginRequired: true });
  });
});

describe("login obligatorio, de extremo a extremo con el servidor real", () => {
  it("exige el token de sesión también en las rutas ya montadas", async () => {
    const withoutToken = await app.inject({ method: "GET", url: "/collection-items" });
    expect(withoutToken.statusCode).toBe(401);

    const health = await app.inject({ method: "GET", url: "/health" });
    expect(health.statusCode).toBe(200);

    const withToken = await injectAuthed({ method: "GET", url: "/collection-items" });
    expect(withToken.statusCode).toBe(200);
  });

  it("POST /login responde 401 con la contraseña incorrecta", async () => {
    const res = await app.inject({ method: "POST", url: "/login", payload: { email: "demo@example.com", password: "mal" } });
    expect(res.statusCode).toBe(401);
  });

  it("POST /login responde 401 con un email que no existe", async () => {
    const res = await app.inject({ method: "POST", url: "/login", payload: { email: "otro@example.com", password: "demo-pass" } });
    expect(res.statusCode).toBe(401);
  });

  it("un token de sesión firmado con otro secreto no sirve", async () => {
    const otherApp = await buildServer(pool, createFakePokemonTcgProvider(), { logger: false, sessionSecret: "otro-secreto-distinto" });

    const login = await otherApp.inject({ method: "POST", url: "/login", payload: { email: "demo@example.com", password: "demo-pass" } });
    const { token } = login.json();

    const res = await app.inject({ method: "GET", url: "/collection-items", headers: { authorization: `Bearer ${token}` } });
    expect(res.statusCode).toBe(401);

    await otherApp.close();
  });

  it("/login tiene su propio límite de peticiones, más estricto que el general de la API", async () => {
    const attempts = await Promise.all(
      Array.from({ length: 11 }, () => app.inject({ method: "POST", url: "/login", payload: { email: "demo@example.com", password: "mal" } })),
    );
    expect(attempts.some((res) => res.statusCode === 429)).toBe(true);
  });
});

describe("manejador de errores global", () => {
  it("un error no controlado (500) no filtra el mensaje interno al cliente", async () => {
    // Payload válido (pasa la validación de la aplicación) con un id que no es un UUID:
    // Postgres lanza un error de sintaxis real al llegar a la query — justo el caso que
    // antes habría devuelto el mensaje del driver de Postgres tal cual al cliente.
    const res = await injectAuthed({
      method: "PUT",
      url: "/collection-items/no-es-un-uuid",
      payload: {
        name: "Charizard",
        setName: "Base",
        number: "4",
        rarity: "Rare Holo",
        variant: "normal",
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
      },
    });
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: "Error interno del servidor" });
  });
});
