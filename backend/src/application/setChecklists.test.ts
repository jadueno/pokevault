import { describe, expect, it } from "vitest";
import type { NewCatalogInput, PokemonTcgCardData, PokemonTcgProvider, ResyncCatalogInput, SetChecklistRepository } from "../domain/ports.js";
import type { SetChecklist, SetChecklistKind } from "../domain/types.js";
import { createFakePokemonTcgProvider } from "../infrastructure/catalog/fakePokemonTcgProvider.js";
import { createSetChecklistUseCases } from "./setChecklists.js";

interface FakeCatalog {
  id: string;
  externalSetId: string;
  setName: string;
  totalCards: number;
  syncedAt: string;
  kind: SetChecklistKind;
  pokemonNames: string[] | null;
  cards: PokemonTcgCardData[];
}

interface FakeChecklistRow {
  id: string;
  userId: string;
  catalogId: string;
  setNameEs: string | null;
}

/** Almacén en memoria COMPARTIDO entre repos de distintos usuarios — es lo que permite
 * simular la reutilización de catálogo entre usuarios (mismo criterio que la base de
 * datos real, donde `set_catalogs` es compartida entre todos). */
function createFakeCatalogStore() {
  const catalogs: FakeCatalog[] = [];
  const checklists: FakeChecklistRow[] = [];
  let nextCatalogId = 1;
  let nextChecklistId = 1;
  return {
    catalogs,
    checklists,
    nextCatalogId: () => String(nextCatalogId++),
    nextChecklistId: () => String(nextChecklistId++),
  };
}
type CatalogStore = ReturnType<typeof createFakeCatalogStore>;

function countDistinctCards(cards: PokemonTcgCardData[]): number {
  return new Set(cards.map((c) => `${c.setName}::${c.number}`)).size;
}

function composeSetChecklist(row: FakeChecklistRow, catalog: FakeCatalog): SetChecklist {
  return {
    id: row.id,
    externalSetId: catalog.externalSetId,
    setName: catalog.setName,
    setNameEs: row.setNameEs,
    totalCards: catalog.totalCards,
    syncedAt: catalog.syncedAt,
    kind: catalog.kind,
    pokemonNames: catalog.pokemonNames,
  };
}

function createFakeSetChecklistRepository(store: CatalogStore, userId: string): SetChecklistRepository {
  function findRow(predicate: (row: FakeChecklistRow) => boolean) {
    const row = store.checklists.find((c) => c.userId === userId && predicate(c));
    if (!row) return null;
    const catalog = store.catalogs.find((cat) => cat.id === row.catalogId)!;
    return { row, catalog };
  }

  return {
    async list() {
      return store.checklists
        .filter((c) => c.userId === userId)
        .map((row) => composeSetChecklist(row, store.catalogs.find((cat) => cat.id === row.catalogId)!));
    },
    async findById(id: string) {
      const found = findRow((row) => row.id === id);
      return found ? composeSetChecklist(found.row, found.catalog) : null;
    },
    async findByExternalId(externalSetId: string) {
      const found = findRow((row) => store.catalogs.find((cat) => cat.id === row.catalogId)?.externalSetId === externalSetId);
      return found ? composeSetChecklist(found.row, found.catalog) : null;
    },
    async getCards() {
      return [];
    },
    async findCatalogByExternalId(externalSetId: string) {
      const catalog = store.catalogs.find((cat) => cat.externalSetId === externalSetId);
      return catalog ? { id: catalog.id } : null;
    },
    async createChecklistWithNewCatalog(input: NewCatalogInput) {
      const catalog: FakeCatalog = {
        id: store.nextCatalogId(),
        externalSetId: input.externalSetId,
        setName: input.setName,
        totalCards: countDistinctCards(input.cards),
        syncedAt: new Date().toISOString(),
        kind: input.kind,
        pokemonNames: input.pokemonNames,
        cards: input.cards,
      };
      store.catalogs.push(catalog);
      const row: FakeChecklistRow = { id: store.nextChecklistId(), userId, catalogId: catalog.id, setNameEs: input.setNameEs };
      store.checklists.push(row);
      return composeSetChecklist(row, catalog);
    },
    async addChecklistToCatalog(catalogId: string, userSetNameEs: string | null) {
      const catalog = store.catalogs.find((cat) => cat.id === catalogId)!;
      const row: FakeChecklistRow = { id: store.nextChecklistId(), userId, catalogId, setNameEs: userSetNameEs };
      store.checklists.push(row);
      return composeSetChecklist(row, catalog);
    },
    async resyncCatalog(checklistId: string, input: ResyncCatalogInput) {
      const found = findRow((row) => row.id === checklistId);
      if (!found) return null;
      found.catalog.setName = input.setName;
      found.catalog.cards = input.cards;
      found.catalog.totalCards = countDistinctCards(input.cards);
      found.catalog.syncedAt = new Date().toISOString();
      return composeSetChecklist(found.row, found.catalog);
    },
  };
}

function setup(store: CatalogStore = createFakeCatalogStore(), userId = "user-1") {
  const repo = createFakeSetChecklistRepository(store, userId);
  const provider = createFakePokemonTcgProvider();
  return { repo, store, useCases: createSetChecklistUseCases(repo, provider) };
}

/** Envuelve el proveedor fake contando llamadas a getSetCards — para probar que reutilizar
 * un catálogo existente no vuelve a llamar al proveedor. */
function createCountingProvider(): { provider: PokemonTcgProvider; getSetCardsCalls: string[] } {
  const inner = createFakePokemonTcgProvider();
  const getSetCardsCalls: string[] = [];
  return {
    getSetCardsCalls,
    provider: {
      ...inner,
      getSetCards: async (externalSetId: string) => {
        getSetCardsCalls.push(externalSetId);
        return inner.getSetCards(externalSetId);
      },
    },
  };
}

describe("createSetChecklistUseCases", () => {
  describe("search", () => {
    it("devuelve los candidatos que encuentra el proveedor", async () => {
      const { useCases } = setup();
      const results = await useCases.search("Test Set");
      expect(results).toEqual([{ externalSetId: "ts1", name: "Test Set", totalCards: 2, releaseDate: "2026/01/01" }]);
    });

    it("sin coincidencias, devuelve una lista vacía (no un error)", async () => {
      const { useCases } = setup();
      expect(await useCases.search("no existe este set")).toEqual([]);
    });
  });

  describe("searchCards", () => {
    it("devuelve la carta que encuentra el proveedor por nombre", async () => {
      const { useCases } = setup();
      const results = await useCases.searchCards("pikachu", null, null);
      expect(results).toEqual([expect.objectContaining({ name: "Fake Pikachu", setName: "Test Set" })]);
    });

    it("con un nombre ambiguo, devuelve todos los candidatos que encuentra el proveedor", async () => {
      const { useCases } = setup();
      const results = await useCases.searchCards("charizard", null, null);
      expect(results).toHaveLength(2);
    });

    it("sin coincidencias, devuelve una lista vacía (no un error)", async () => {
      const { useCases } = setup();
      expect(await useCases.searchCards("no existe esta carta", null, null)).toEqual([]);
    });

    it("rechaza un nombre vacío", async () => {
      const { useCases } = setup();
      await expect(useCases.searchCards("", null, null)).rejects.toThrow("no puede estar vacío");
    });
  });

  describe("sync", () => {
    it("sincroniza un set nuevo con sus cartas y precio", async () => {
      const { useCases } = setup();
      const result = await useCases.sync("ts1", "Set de Prueba");
      expect(result?.externalSetId).toBe("ts1");
      expect(result?.setNameEs).toBe("Set de Prueba");
      expect(result?.totalCards).toBe(2);
    });

    it("si ya está sincronizado, no repite el trabajo (devuelve null)", async () => {
      const { useCases } = setup();
      await useCases.sync("ts1", "Set de Prueba");
      const second = await useCases.sync("ts1", "Otro alias");
      expect(second).toBeNull();
    });

    it("si el proveedor falla (id inexistente), devuelve null en vez de lanzar", async () => {
      const { useCases } = setup();
      expect(await useCases.sync("no-existe", null)).toBeNull();
    });
  });

  describe("resync", () => {
    it("vuelve a traer las cartas de un checklist ya sincronizado", async () => {
      const { useCases } = setup();
      const synced = await useCases.sync("ts1", "Set de Prueba");
      const resynced = await useCases.resync(synced!.id);
      expect(resynced?.id).toBe(synced!.id);
      expect(resynced?.setNameEs).toBe("Set de Prueba");
    });

    it("si el checklist no existe, devuelve null", async () => {
      const { useCases } = setup();
      expect(await useCases.resync("no-existe")).toBeNull();
    });

    it("de un binder, repite la búsqueda por los mismos nombres de Pokémon (no un set)", async () => {
      const { useCases } = setup();
      const created = await useCases.createBinder("Slowpoke y Slowbro", ["Slowpoke", "Slowbro"]);
      const resynced = await useCases.resync(created!.id);
      expect(resynced?.id).toBe(created!.id);
      expect(resynced?.kind).toBe("binder");
      expect(resynced?.setNameEs).toBe("Slowpoke y Slowbro");
      expect(resynced?.totalCards).toBe(3);
    });
  });

  describe("createBinder", () => {
    it("crea un binder con todas las cartas de los Pokémon indicados, de expansiones distintas", async () => {
      const { useCases } = setup();
      const result = await useCases.createBinder("Slowpoke y Slowbro", ["Slowpoke", "Slowbro"]);
      expect(result?.kind).toBe("binder");
      expect(result?.setNameEs).toBe("Slowpoke y Slowbro");
      expect(result?.pokemonNames).toEqual(["Slowpoke", "Slowbro"]);
      // 2 Slowpoke (expansiones distintas, mismo número local "1") + 1 Slowbro: se cuentan
      // por separado aunque compartan número, porque no son la misma carta.
      expect(result?.totalCards).toBe(3);
    });

    it("si ya existe un binder con exactamente estos Pokémon, no repite el trabajo (devuelve null)", async () => {
      const { useCases } = setup();
      await useCases.createBinder("Slowpoke y Slowbro", ["Slowpoke", "Slowbro"]);
      const second = await useCases.createBinder("Otro título", ["Slowbro", "Slowpoke"]);
      expect(second).toBeNull();
    });

    it("rechaza un título vacío", async () => {
      const { useCases } = setup();
      await expect(useCases.createBinder("", ["Slowpoke"])).rejects.toThrow("no puede estar vacío");
    });

    it("rechaza una lista de Pokémon vacía", async () => {
      const { useCases } = setup();
      await expect(useCases.createBinder("Binder vacío", [])).rejects.toThrow("al menos un nombre");
    });

    it("si el proveedor no encuentra ninguna carta, crea igualmente el binder vacío", async () => {
      const { useCases } = setup();
      const result = await useCases.createBinder("Nada", ["no-existe-este-pokemon"]);
      expect(result?.totalCards).toBe(0);
    });
  });

  describe("catálogo compartido entre usuarios", () => {
    it("dos usuarios sincronizando el mismo set comparten un único catálogo, sin llamar dos veces al proveedor", async () => {
      const store = createFakeCatalogStore();
      const { provider, getSetCardsCalls } = createCountingProvider();
      const useCasesA = createSetChecklistUseCases(createFakeSetChecklistRepository(store, "user-a"), provider);
      const useCasesB = createSetChecklistUseCases(createFakeSetChecklistRepository(store, "user-b"), provider);

      const a = await useCasesA.sync("ts1", "Alias A");
      const b = await useCasesB.sync("ts1", "Alias B");

      expect(a?.setNameEs).toBe("Alias A");
      expect(b?.setNameEs).toBe("Alias B");
      expect(a?.id).not.toBe(b?.id); // punteros distintos...
      expect(store.catalogs).toHaveLength(1); // ...pero un solo catálogo compartido
      expect(getSetCardsCalls).toEqual(["ts1"]); // el proveedor solo se llamó una vez
    });

    it("el resync de un usuario usa el mismo catálogo compartido, sin duplicarlo", async () => {
      const store = createFakeCatalogStore();
      const { useCases: useCasesA } = setup(store, "user-a");
      const { useCases: useCasesB } = setup(store, "user-b");
      const a = await useCasesA.sync("ts1", "Alias A");
      await useCasesB.sync("ts1", "Alias B");

      const resynced = await useCasesA.resync(a!.id);

      expect(resynced).not.toBeNull();
      expect(store.catalogs).toHaveLength(1); // el resync no crea un catálogo nuevo
      expect((await useCasesB.list())[0].externalSetId).toBe("ts1"); // el otro usuario lo sigue viendo igual
    });
  });
});
