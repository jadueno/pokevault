import { useCallback, useEffect, useState } from "react";
import type { CollectionItem, CollectionSummary, NewCollectionItem } from "../domain/types";
import { collectionItemClient, getCollectionSummary, overrideCollectionItemValue } from "./api";

export function useCollectionData() {
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemList, summaryData] = await Promise.all([collectionItemClient.list(), getCollectionSummary<CollectionSummary>()]);
      setItems(itemList);
      setSummary(summaryData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando la colección");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    items,
    summary,
    loading,
    error,
    reload,
    addItem: async (entity: NewCollectionItem) => {
      await collectionItemClient.create(entity);
      await reload();
    },
    updateItem: async (id: string, entity: NewCollectionItem) => {
      await collectionItemClient.update(id, entity);
      await reload();
    },
    removeItem: async (id: string) => {
      await collectionItemClient.remove(id);
      // Quita el ítem de la lista de inmediato en vez de esperar solo al reload: si el
      // reload falla o se retrasa (p. ej. por el rate-limit si hay varias pestañas
      // abiertas), el ítem ya borrado en el backend no se queda visible por error.
      setItems((prev) => prev.filter((i) => i.id !== id));
      await reload();
    },
    overrideValue: async (id: string, value: number, note: string | null) => {
      await overrideCollectionItemValue(id, value, note);
      await reload();
    },
  };
}
