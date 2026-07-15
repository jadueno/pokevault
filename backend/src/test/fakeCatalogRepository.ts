import type { CatalogRepository, ExternalCatalogCard, ExternalCatalogSet } from "../domain/ports.js";
import type { CatalogCard, CatalogSet, CatalogSyncLog } from "../domain/types.js";

/** Catálogo en memoria para testear casos de uso sin depender de Postgres. Replica el
 * comportamiento real de upsert-por-(provider,externalId) para que los tests de
 * syncCatalog puedan verificar idempotencia sin BD. */
export function createFakeCatalogRepository(): CatalogRepository {
  const sets: CatalogSet[] = [];
  const cards: CatalogCard[] = [];
  const syncLogs: CatalogSyncLog[] = [];
  let nextId = 1;

  return {
    async listSets() {
      return [...sets];
    },
    async searchCards(filters) {
      let result = [...cards];
      if (filters.query) {
        const q = filters.query.toLowerCase();
        result = result.filter((c) => c.name.toLowerCase().includes(q));
      }
      if (filters.setId) result = result.filter((c) => c.setId === filters.setId);
      if (filters.rarity) result = result.filter((c) => c.rarity === filters.rarity);
      return result;
    },
    async getCard(id) {
      return cards.find((c) => c.id === id) ?? null;
    },
    async getCardsByIds(ids) {
      return cards.filter((c) => ids.includes(c.id));
    },
    async upsertSet(provider, set: ExternalCatalogSet) {
      const existing = sets.find((s) => s.provider === provider && s.externalId === set.externalId);
      const value: CatalogSet = {
        id: existing?.id ?? String(nextId++),
        provider,
        externalId: set.externalId,
        name: set.name,
        series: set.series,
        printedTotal: set.printedTotal,
        total: set.total,
        releaseDate: set.releaseDate,
        symbolUrl: set.symbolUrl,
        logoUrl: set.logoUrl,
      };
      if (existing) Object.assign(existing, value);
      else sets.push(value);
      return value;
    },
    async upsertCard(provider, setId, card: ExternalCatalogCard) {
      const existing = cards.find((c) => c.provider === provider && c.externalId === card.externalId);
      const value: CatalogCard = {
        id: existing?.id ?? String(nextId++),
        provider,
        externalId: card.externalId,
        setId,
        name: card.name,
        number: card.number,
        rarity: card.rarity,
        artist: card.artist,
        supertype: card.supertype,
        subtypes: card.subtypes,
        types: card.types,
        imageSmallUrl: card.imageSmallUrl,
        imageLargeUrl: card.imageLargeUrl,
        currentPrice: card.price?.amount ?? null,
        currentPriceCurrency: card.price?.currency ?? null,
        priceUpdatedAt: card.price ? new Date().toISOString() : null,
        priceSource: card.price ? provider : null,
      };
      if (existing) Object.assign(existing, value);
      else cards.push(value);
      return value;
    },
    async createSyncLog(provider) {
      const log: CatalogSyncLog = {
        id: String(nextId++),
        provider,
        startedAt: new Date().toISOString(),
        finishedAt: null,
        status: "running",
        setsSynced: null,
        cardsSynced: null,
        error: null,
      };
      syncLogs.push(log);
      return log;
    },
    async finishSyncLog(id, result) {
      const log = syncLogs.find((l) => l.id === id);
      if (!log) return;
      log.status = result.status;
      log.setsSynced = result.setsSynced ?? null;
      log.cardsSynced = result.cardsSynced ?? null;
      log.error = result.error ?? null;
      log.finishedAt = new Date().toISOString();
    },
  };
}
