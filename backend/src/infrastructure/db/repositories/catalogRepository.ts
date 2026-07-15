import type { Pool } from "pg";
import type { CatalogRepository, ExternalCatalogCard, ExternalCatalogSet } from "../../../domain/ports.js";
import type { CardSearchFilters, CatalogCard, CatalogSet, CatalogSyncLog, CatalogSyncStatus } from "../../../domain/types.js";

interface SetRow {
  id: string;
  provider: string;
  external_id: string;
  name: string;
  series: string | null;
  printed_total: number | null;
  total: number | null;
  release_date: string | null;
  symbol_url: string | null;
  logo_url: string | null;
}

interface CardRow {
  id: string;
  provider: string;
  external_id: string;
  set_id: string;
  name: string;
  number: string;
  rarity: string | null;
  artist: string | null;
  supertype: string;
  subtypes: string[];
  types: string[];
  image_small_url: string | null;
  image_large_url: string | null;
  current_price: string | null;
  current_price_currency: string | null;
  price_updated_at: string | null;
  price_source: string | null;
}

interface SyncLogRow {
  id: string;
  provider: string;
  started_at: string;
  finished_at: string | null;
  status: CatalogSyncStatus;
  sets_synced: number | null;
  cards_synced: number | null;
  error: string | null;
}

const SET_COLUMNS = "id, provider, external_id, name, series, printed_total, total, release_date, symbol_url, logo_url";
const CARD_COLUMNS = `id, provider, external_id, set_id, name, number, rarity, artist, supertype, subtypes, types,
  image_small_url, image_large_url, current_price, current_price_currency, price_updated_at, price_source`;

function toSet(row: SetRow): CatalogSet {
  return {
    id: row.id,
    provider: row.provider,
    externalId: row.external_id,
    name: row.name,
    series: row.series,
    printedTotal: row.printed_total,
    total: row.total,
    releaseDate: row.release_date,
    symbolUrl: row.symbol_url,
    logoUrl: row.logo_url,
  };
}

function toCard(row: CardRow): CatalogCard {
  return {
    id: row.id,
    provider: row.provider,
    externalId: row.external_id,
    setId: row.set_id,
    name: row.name,
    number: row.number,
    rarity: row.rarity,
    artist: row.artist,
    supertype: row.supertype,
    subtypes: row.subtypes,
    types: row.types,
    imageSmallUrl: row.image_small_url,
    imageLargeUrl: row.image_large_url,
    currentPrice: row.current_price !== null ? Number(row.current_price) : null,
    currentPriceCurrency: row.current_price_currency,
    priceUpdatedAt: row.price_updated_at ? new Date(row.price_updated_at).toISOString() : null,
    priceSource: row.price_source,
  };
}

function toSyncLog(row: SyncLogRow): CatalogSyncLog {
  return {
    id: row.id,
    provider: row.provider,
    startedAt: new Date(row.started_at).toISOString(),
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,
    status: row.status,
    setsSynced: row.sets_synced,
    cardsSynced: row.cards_synced,
    error: row.error,
  };
}

export function createCatalogRepository(pool: Pool): CatalogRepository {
  return {
    async listSets() {
      const { rows } = await pool.query<SetRow>(`select ${SET_COLUMNS} from catalog_sets order by release_date desc nulls last, name`);
      return rows.map(toSet);
    },

    async searchCards(filters: CardSearchFilters) {
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (filters.query) {
        params.push(`%${filters.query.toLowerCase()}%`);
        conditions.push(`lower(name) like $${params.length}`);
      }
      if (filters.setId) {
        params.push(filters.setId);
        conditions.push(`set_id = $${params.length}`);
      }
      if (filters.rarity) {
        params.push(filters.rarity);
        conditions.push(`rarity = $${params.length}`);
      }
      const where = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";
      const pageSize = filters.pageSize ?? 60;
      const page = filters.page ?? 1;
      params.push(pageSize, (page - 1) * pageSize);
      const { rows } = await pool.query<CardRow>(
        `select ${CARD_COLUMNS} from catalog_cards ${where} order by name limit $${params.length - 1} offset $${params.length}`,
        params,
      );
      return rows.map(toCard);
    },

    async getCard(id: string) {
      const { rows } = await pool.query<CardRow>(`select ${CARD_COLUMNS} from catalog_cards where id = $1`, [id]);
      return rows[0] ? toCard(rows[0]) : null;
    },

    async getCardsByIds(ids: string[]) {
      if (ids.length === 0) return [];
      const { rows } = await pool.query<CardRow>(`select ${CARD_COLUMNS} from catalog_cards where id = any($1)`, [ids]);
      return rows.map(toCard);
    },

    async upsertSet(provider: string, set: ExternalCatalogSet) {
      const { rows } = await pool.query<SetRow>(
        `insert into catalog_sets (provider, external_id, name, series, printed_total, total, release_date, symbol_url, logo_url)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         on conflict (provider, external_id) do update
           set name = excluded.name, series = excluded.series, printed_total = excluded.printed_total,
               total = excluded.total, release_date = excluded.release_date, symbol_url = excluded.symbol_url,
               logo_url = excluded.logo_url, updated_at = now()
         returning ${SET_COLUMNS}`,
        [provider, set.externalId, set.name, set.series, set.printedTotal, set.total, set.releaseDate, set.symbolUrl, set.logoUrl],
      );
      return toSet(rows[0]);
    },

    async upsertCard(provider: string, setId: string, card: ExternalCatalogCard) {
      const { rows } = await pool.query<CardRow>(
        `insert into catalog_cards (provider, external_id, set_id, name, number, rarity, artist, supertype,
           subtypes, types, image_small_url, image_large_url, current_price, current_price_currency,
           price_updated_at, price_source, raw_data)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         on conflict (provider, external_id) do update
           set set_id = excluded.set_id, name = excluded.name, number = excluded.number, rarity = excluded.rarity,
               artist = excluded.artist, supertype = excluded.supertype, subtypes = excluded.subtypes,
               types = excluded.types, image_small_url = excluded.image_small_url,
               image_large_url = excluded.image_large_url, current_price = excluded.current_price,
               current_price_currency = excluded.current_price_currency, price_updated_at = excluded.price_updated_at,
               price_source = excluded.price_source, raw_data = excluded.raw_data, updated_at = now()
         returning ${CARD_COLUMNS}`,
        [
          provider,
          card.externalId,
          setId,
          card.name,
          card.number,
          card.rarity,
          card.artist,
          card.supertype,
          card.subtypes,
          card.types,
          card.imageSmallUrl,
          card.imageLargeUrl,
          card.price?.amount ?? null,
          card.price?.currency ?? null,
          card.price ? new Date().toISOString() : null,
          card.price ? provider : null,
          JSON.stringify(card),
        ],
      );
      return toCard(rows[0]);
    },

    async createSyncLog(provider: string) {
      const { rows } = await pool.query<SyncLogRow>(
        `insert into catalog_sync_log (provider, status) values ($1, 'running')
         returning id, provider, started_at, finished_at, status, sets_synced, cards_synced, error`,
        [provider],
      );
      return toSyncLog(rows[0]);
    },

    async finishSyncLog(id, result) {
      await pool.query(
        `update catalog_sync_log
         set status = $1, sets_synced = $2, cards_synced = $3, error = $4, finished_at = now()
         where id = $5`,
        [result.status, result.setsSynced ?? null, result.cardsSynced ?? null, result.error ?? null, id],
      );
    },
  };
}
