import { useCallback, useEffect, useState } from "react";
import type { SetChecklist, SetChecklistCard, SetSearchCandidate } from "../domain/types";
import { createPokemonBinder, createSetChecklist, getSetChecklistCards, getSetChecklists, resyncSetChecklist, searchSets } from "./api";

export function useSetChecklistData() {
  const [checklists, setChecklists] = useState<SetChecklist[]>([]);
  const [cardsByChecklist, setCardsByChecklist] = useState<Record<string, SetChecklistCard[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const lists = await getSetChecklists();
      setChecklists(lists);
      // Precarga las cartas de todos los checklists de golpe (no solo al abrir uno): hacen
      // falta ya cargadas para poder buscar la imagen oficial de una carta al darla de alta
      // (ver findChecklistCardImage), no solo al mirar la pestaña "Sets". En uso personal
      // real hay como mucho unos pocos sets sincronizados (100-250 cartas cada uno, sin
      // imágenes embebidas, solo URLs), así que no compensa la complejidad de cargar cada
      // uno bajo demanda.
      const entries = await Promise.all(lists.map(async (checklist) => [checklist.id, await getSetChecklistCards(checklist.id)] as const));
      setCardsByChecklist(Object.fromEntries(entries));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando los checklists de set");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    checklists,
    cardsByChecklist,
    loading,
    error,
    reload,
    search: (query: string): Promise<SetSearchCandidate[]> => searchSets(query),
    sync: async (externalSetId: string, setNameEs: string | null) => {
      const result = await createSetChecklist(externalSetId, setNameEs);
      await reload();
      return result;
    },
    createBinder: async (title: string, pokemonNames: string[]) => {
      const result = await createPokemonBinder(title, pokemonNames);
      await reload();
      return result;
    },
    resync: async (checklistId: string) => {
      const result = await resyncSetChecklist(checklistId);
      await reload();
      return result;
    },
  };
}
