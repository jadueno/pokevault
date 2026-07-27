import { useCallback, useEffect, useState } from "react";
import type { NewSealedPurchase, SealedPurchase } from "../domain/types";
import { overrideSealedPurchaseValue, sealedPurchaseClient } from "./api";

/** `enabled`: en false no dispara ninguna petición — ver useCollectionData. */
export function useSealedData(enabled = true) {
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
    if (enabled) reload();
  }, [enabled, reload]);

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
      // Quita el ítem de la lista de inmediato en vez de esperar solo al reload: si el
      // reload falla o se retrasa (p. ej. por el rate-limit si hay varias pestañas
      // abiertas), el ítem ya borrado en el backend no se queda visible por error.
      setItems((prev) => prev.filter((i) => i.id !== id));
      await reload();
    },
    overrideValue: async (id: string, value: number, note: string | null) => {
      await overrideSealedPurchaseValue(id, value, note);
      await reload();
    },
  };
}
