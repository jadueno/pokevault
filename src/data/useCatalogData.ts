import { useCallback, useEffect, useState } from "react";
import type { CatalogCard, CatalogSet } from "../domain/types";
import { getCatalogCard, listCatalogSets, searchCatalogCards } from "./api";

export function useCatalogData() {
  const [sets, setSets] = useState<CatalogSet[]>([]);
  const [results, setResults] = useState<CatalogCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listCatalogSets<CatalogSet[]>()
      .then(setSets)
      .catch(() => setSets([]));
  }, []);

  const search = useCallback(async (query: string, setId?: string) => {
    setLoading(true);
    setError(null);
    try {
      setResults(await searchCatalogCards<CatalogCard[]>({ q: query || undefined, setId }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error buscando cartas");
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    sets,
    results,
    loading,
    error,
    search,
    getCard: (id: string) => getCatalogCard<CatalogCard>(id),
  };
}
