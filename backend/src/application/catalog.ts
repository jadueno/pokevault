import type { CatalogRepository } from "../domain/ports.js";
import type { CardSearchFilters } from "../domain/types.js";

/**
 * Solo lee la caché local (catalog_sets/catalog_cards) — nunca llama al proveedor
 * externo en una petición de usuario. Ver infrastructure/catalog/syncCatalog.ts para
 * quién sí lo llama.
 */
export function createCatalogUseCases(repo: CatalogRepository) {
  return {
    listSets: () => repo.listSets(),
    searchCards: (filters: CardSearchFilters) => repo.searchCards(filters),
    getCard: (id: string) => repo.getCard(id),
  };
}
