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
        totalCards: input.cards.length,
        syncedAt: new Date().toISOString(),
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
  });
});
