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
      await reload();
    },
    overrideValue: async (id: string, value: number, note: string | null) => {
      await overrideCollectionItemValue(id, value, note);
      await reload();
    },
  };
}
