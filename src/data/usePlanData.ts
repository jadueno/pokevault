import { useCallback, useEffect, useState } from "react";
import type { NewPlanItem, PlanItem, PlanSettings } from "../domain/types";
import { getPlanSettings, planItemClient, togglePlanItemDone, updatePlanSettings } from "./api";

export function usePlanData() {
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
    reload();
  }, [reload]);

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
