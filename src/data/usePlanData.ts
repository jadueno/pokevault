import { useCallback, useEffect, useState } from "react";
import type { NewPlanItem, PlanItem, PlanSettings } from "../domain/types";
import { getPlanSettings, planItemClient, togglePlanItemDone, updatePlanSettings } from "./api";

/** `enabled`: en false no dispara ninguna petición — ver useCollectionData. */
export function usePlanData(enabled = true) {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [settings, setSettings] = useState<PlanSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsResult, settingsResult] = await Promise.all([
        planItemClient.list(),
        getPlanSettings<PlanSettings>(),
      ]);
      setItems(itemsResult);
      setSettings(settingsResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando el plan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  return {
    items,
    settings,
    loading,
    error,
    reload,
    addItem: async (entity: NewPlanItem) => {
      await planItemClient.create(entity);
      await reload();
    },
    updateItem: async (id: string, entity: NewPlanItem) => {
      await planItemClient.update(id, entity);
      await reload();
    },
    removeItem: async (id: string) => {
      await planItemClient.remove(id);
      // Quita el ítem de la lista de inmediato en vez de esperar solo al reload: si el
      // reload falla o se retrasa (p. ej. por el rate-limit si hay varias pestañas
      // abiertas), el ítem ya borrado en el backend no se queda visible por error.
      setItems((prev) => prev.filter((i) => i.id !== id));
      await reload();
    },
    toggleDone: async (id: string) => {
      await togglePlanItemDone(id);
      await reload();
    },
    updateSettings: async (entity: PlanSettings) => {
      await updatePlanSettings(entity);
      await reload();
    },
  };
}
