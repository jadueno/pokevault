import { useCallback, useEffect, useState } from "react";
import type { SetChecklist, SetChecklistCard } from "../domain/types";
import { getSetChecklistCards, getSetChecklists } from "./api";

export function useSetChecklistData() {
  const [checklists, setChecklists] = useState<SetChecklist[]>([]);
  const [cardsByChecklist, setCardsByChecklist] = useState<Record<string, SetChecklistCard[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setChecklists(await getSetChecklists());
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
    // Las cartas de cada checklist se cargan solo cuando el usuario lo abre (pueden ser
    // 100-250 por set) en vez de traerlas todas al entrar en la pantalla.
    loadCards: async (checklistId: string) => {
      const cards = await getSetChecklistCards(checklistId);
      setCardsByChecklist((prev) => ({ ...prev, [checklistId]: cards }));
    },
  };
}
