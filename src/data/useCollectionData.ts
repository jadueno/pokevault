import { useCallback, useEffect, useState } from "react";
import type { CollectionItemWithCard, CollectionSummary, NewCollectionItem } from "../domain/types";
import {
  createCollectionItem,
  getCollectionSummary,
  listCollectionItems,
  overrideCollectionItemValue,
  removeCollectionItem,
  updateCollectionItem,
} from "./api";

export function useCollectionData() {
  const [items, setItems] = useState<CollectionItemWithCard[]>([]);
  const [summary, setSummary] = useState<CollectionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemList, summaryData] = await Promise.all([
        listCollectionItems<CollectionItemWithCard[]>(),
        getCollectionSummary<CollectionSummary>(),
      ]);
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
      await createCollectionItem(entity);
      await reload();
    },
    updateItem: async (id: string, entity: NewCollectionItem) => {
      await updateCollectionItem(id, entity);
      await reload();
    },
    removeItem: async (id: string) => {
      await removeCollectionItem(id);
      await reload();
    },
    overrideValue: async (id: string, value: number, note: string | null) => {
      await overrideCollectionItemValue(id, value, note);
      await reload();
    },
  };
}
