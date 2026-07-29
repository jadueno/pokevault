import type { PokemonTcgProvider, SetChecklistRepository } from "../domain/ports.js";
import type { SetChecklist } from "../domain/types.js";
import { assertNonEmpty, ValidationError } from "./errors.js";

/** Id determinista a partir de los nombres de Pokémon (orden alfabético, normalizado) —
 * para que crear el mismo binder dos veces actualice el existente en vez de duplicarlo,
 * igual que el id real de un set oficial evita duplicar su sincronización. */
function binderExternalId(pokemonNames: string[]): string {
  return `binder:${[...pokemonNames].map((n) => n.trim().toLowerCase()).sort().join("+")}`;
}

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
     * el alta manual de una carta suelta que no está en ningún set sincronizado. */
    searchCards: async (name: string, setName: string | null, number: string | null) => {
      assertNonEmpty(name, "El nombre de la carta");
      try {
        return await provider.searchCards({ name, setName, number });
      } catch {
        return [];
      }
    },

    /** Sincroniza un set elegido explícitamente por su id — nunca adivinado. Si YO ya lo
     * tengo añadido, no repite el trabajo (usar `resync` para eso). Si no lo tengo pero YA
     * existe un catálogo compartido para este set real (lo sincronizó otro usuario), solo
     * añade mi puntero — sin llamar al proveedor ni duplicar cartas (ver
     * ARCHITECTURE.md, separación catálogo/checklist). Solo si no existe ningún catálogo
     * todavía se llama al proveedor y se crea uno nuevo. `setNameEs` es el nombre en
     * español que devolvió el proveedor al buscarlo (no lo que haya escrito el usuario en
     * el buscador, que puede no ser exacto — ver SetSearchPanel.handleSync). */
    sync: async (externalSetId: string, setNameEs: string | null): Promise<SetChecklist | null> => {
      assertNonEmpty(externalSetId, "El id del set");
      const existing = await repo.findByExternalId(externalSetId);
      if (existing) return null;

      const catalog = await repo.findCatalogByExternalId(externalSetId);
      if (catalog) {
        return await repo.addChecklistToCatalog(catalog.id, setNameEs);
      }
      try {
        const { setName, cards } = await provider.getSetCards(externalSetId);
        return await repo.createChecklistWithNewCatalog({ externalSetId, setName, setNameEs, cards, kind: "official", pokemonNames: null });
      } catch {
        return null;
      }
    },

    /** Crea un "binder" personalizado: todas las cartas de uno o varios Pokémon, de
     * cualquier expansión donde hayan salido (p. ej. "Slowpoke y Slowbro" reunidos en un
     * único checklist) — alternativa a sincronizar un set oficial completo. `title` es el
     * texto que ve el usuario en vez de un nombre de expansión real — siempre el alias
     * propio de quien lo crea/añade, nunca el de otro usuario aunque se reutilice su
     * catálogo. Mismo criterio de dedup + reutilización de catálogo que `sync`. */
    createBinder: async (title: string, pokemonNames: string[]): Promise<SetChecklist | null> => {
      assertNonEmpty(title, "El título del binder");
      const names = pokemonNames.map((n) => n.trim()).filter((n) => n.length > 0);
      if (names.length === 0) {
        throw new ValidationError("Indica al menos un nombre de Pokémon");
      }
      const externalSetId = binderExternalId(names);
      const existing = await repo.findByExternalId(externalSetId);
      if (existing) return null;

      const catalog = await repo.findCatalogByExternalId(externalSetId);
      if (catalog) {
        return await repo.addChecklistToCatalog(catalog.id, title);
      }
      try {
        const cards = await provider.getCardsByPokemonNames(names);
        return await repo.createChecklistWithNewCatalog({
          externalSetId,
          setName: title,
          setNameEs: title,
          cards,
          kind: "binder",
          pokemonNames: names,
        });
      } catch {
        return null;
      }
    },

    /** Refresca el catálogo COMPARTIDO al que apunta este checklist — afecta a todos los
     * usuarios que lo tengan añadido, no solo a quien pulsa "Actualizar". En un binder
     * repite la búsqueda por los mismos nombres de Pokémon en vez de pedir un set; en un
     * set oficial toma el nombre fresco del proveedor por si el nombre canónico cambió. */
    resync: async (checklistId: string): Promise<SetChecklist | null> => {
      const checklist = await repo.findById(checklistId);
      if (!checklist) return null;
      try {
        // En un binder, "setName" es el título que puso quien lo creó (no viene del
        // proveedor, que solo da las cartas) — se mantiene tal cual. En un set oficial sí
        // se refresca con lo que devuelva el proveedor, por si el nombre canónico cambia.
        const { setName, cards } =
          checklist.kind === "binder"
            ? { setName: checklist.setName, cards: await provider.getCardsByPokemonNames(checklist.pokemonNames ?? []) }
            : await provider.getSetCards(checklist.externalSetId);
        return await repo.resyncCatalog(checklistId, { setName, cards });
      } catch {
        return null;
      }
    },
  };
}
