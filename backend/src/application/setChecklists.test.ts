import { describe, expect, it } from "vitest";
import type { SetChecklistRepository, UpsertChecklistInput } from "../domain/ports.js";
import type { SetChecklist } from "../domain/types.js";
import { createFakePokemonTcgProvider } from "../infrastructure/catalog/fakePokemonTcgProvider.js";
import { createSetChecklistUseCases } from "./setChecklists.js";

function createFakeSetChecklistRepository(): SetChecklistRepository {
  const checklists: SetChecklist[] = [];
  let nextId = 1;

  return {
    async list() {
      return [...checklists];
    },
    async findById(id: string) {
      return checklists.find((c) => c.id === id) ?? null;
    },
    async findByExternalId(externalSetId: string) {
      return checklists.find((c) => c.externalSetId === externalSetId) ?? null;
    },
    async getCards() {
      return [];
    },
    async upsertChecklist(input: UpsertChecklistInput) {
      const index = checklists.findIndex((c) => c.externalSetId === input.externalSetId);
      const checklist: SetChecklist = {
        id: index === -1 ? String(nextId++) : checklists[index].id,
        externalSetId: input.externalSetId,
        setName: input.setName,
        setNameEs: input.setNameEs,
        totalCards: new Set(input.cards.map((c) => `${c.setName}::${c.number}`)).size,
        syncedAt: new Date().toISOString(),
        kind: input.kind,
        pokemonNames: input.pokemonNames,
      };
      if (index === -1) checklists.push(checklist);
      else checklists[index] = checklist;
      return checklist;
    },
  };
}

function setup() {
  const repo = createFakeSetChecklistRepository();
  const provider = createFakePokemonTcgProvider();
  return { repo, useCases: createSetChecklistUseCases(repo, provider) };
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
});
