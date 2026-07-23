import type { PokemonTcgProvider, SetChecklistRepository } from "../domain/ports.js";
import type { SetChecklist } from "../domain/types.js";
import { assertNonEmpty } from "./errors.js";

/** Cualquier fallo del proveedor externo (red, timeout, HTTP no-2xx) se captura aquí y se
 * trata como "sin resultado" — nunca deja que un problema del proveedor se convierta en
 * un 500 de nuestra propia API, por eso solo se llama en acciones explícitas del usuario
 * (ver ARCHITECTURE.md). */
export function createSetChecklistUseCases(repo: SetChecklistRepository, provider: PokemonTcgProvider) {
  return {
    list: () => repo.list(),
    getCards: (checklistId: string) => repo.getCards(checklistId),

    search: async (query: string) => {
      assertNonEmpty(query, "El nombre del set");
      try {
        return await provider.searchSets(query);
      } catch {
        return [];
      }
    },

    /** Busca una carta concreta por nombre (+ pistas opcionales de expansión/número) en
     * todo el catálogo del proveedor, sin depender de que el set esté sincronizado — para
     * el alta manual asistida por foto (ver application/cardRecognition.ts). */
    searchCards: async (name: string, setName: string | null, number: string | null) => {
      assertNonEmpty(name, "El nombre de la carta");
      try {
        return await provider.searchCards({ name, setName, number });
      } catch {
        return [];
      }
    },

    /** Sincroniza un set elegido explícitamente por su id — nunca adivinado. Si ya está
     * sincronizado no repite el trabajo (usar `resync` para eso). `setNameEs` es el texto
     * que escribió el usuario para encontrarlo, para que la próxima carta del mismo set
     * (aunque la escriba distinto al nombre oficial en inglés) se siga relacionando en
     * local sin otra llamada de red. */
    sync: async (externalSetId: string, setNameEs: string | null): Promise<SetChecklist | null> => {
      assertNonEmpty(externalSetId, "El id del set");
      const existing = (await repo.list()).find((c) => c.externalSetId === externalSetId);
      if (existing) return null;
      try {
        const { setName, cards } = await provider.getSetCards(externalSetId);
        return await repo.upsertChecklist({ externalSetId, setName, setNameEs, cards });
      } catch {
        return null;
      }
    },

    /** Vuelve a traer las cartas de un set ya sincronizado (mismo externalSetId, mismo
     * alias) — para rellenar precio en checklists sincronizados antes de que existiera
     * ese campo, sin tener que borrarlo y volver a añadirlo a mano. */
    resync: async (checklistId: string): Promise<SetChecklist | null> => {
      const checklist = (await repo.list()).find((c) => c.id === checklistId);
      if (!checklist) return null;
      try {
        const { setName, cards } = await provider.getSetCards(checklist.externalSetId);
        return await repo.upsertChecklist({
          externalSetId: checklist.externalSetId,
          setName,
          setNameEs: checklist.setNameEs,
          cards,
        });
      } catch {
        return null;
      }
    },
  };
}
