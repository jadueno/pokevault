import { useCallback, useEffect, useState } from "react";
import type { NewSealedPurchase, SealedPurchase } from "../domain/types";
import { overrideSealedPurchaseValue, sealedPurchaseClient } from "./api";

export function useSealedData() {
  const [items, setItems] = useState<SealedPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await sealedPurchaseClient.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando el producto sellado");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    items,
    loading,
    error,
    reload,
    addItem: async (entity: NewSealedPurchase) => {
      await sealedPurchaseClient.create(entity);
      await reload();
    },
    updateItem: async (id: string, entity: NewSealedPurchase) => {
      await sealedPurchaseClient.update(id, entity);
      await reload();
    },
    removeItem: async (id: string) => {
      await sealedPurchaseClient.remove(id);
      await reload();
    },
    overrideValue: async (id: string, value: number, note: string | null) => {
      await overrideSealedPurchaseValue(id, value, note);
      await reload();
    },
  };
}
