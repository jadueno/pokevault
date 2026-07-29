import type { Pool } from "pg";
import type { CardVariant, SetChecklist, SetChecklistCard, SetChecklistKind } from "../../../domain/types.js";
import type { NewCatalogInput, PokemonTcgCardData, ResyncCatalogInput, SetChecklistRepository } from "../../../domain/ports.js";

interface ComposedRow {
  id: string;
  external_set_id: string;
  set_name: string;
  set_name_es: string | null;
  total_cards: number;
  synced_at: string;
  kind: string;
  pokemon_names: string[] | null;
}

interface SetCatalogCardRow {
  id: string;
  number: string;
  name: string;
  rarity: string | null;
  variant: string;
  image_url: string | null;
  image_url_large: string | null;
  reference_price: string | null;
  set_name: string | null;
  set_total_cards: number | null;
}

// El JOIN set_checklists (sc) + set_catalogs (cat) es lo que compone el `SetChecklist`
// público de siempre: solo "id"/"setNameEs" son propios de un usuario, el resto viene del
// catálogo compartido.
const COMPOSED_COLUMNS = `
  sc.id, cat.external_set_id, cat.set_name, sc.set_name_es, cat.total_cards, cat.synced_at, cat.kind, cat.pokemon_names
`;
const COMPOSED_FROM = "from set_checklists sc join set_catalogs cat on cat.id = sc.catalog_id";

function toSetChecklist(row: ComposedRow): SetChecklist {
  return {
    id: row.id,
    externalSetId: row.external_set_id,
    setName: row.set_name,
    setNameEs: row.set_name_es,
    totalCards: row.total_cards,
    syncedAt: new Date(row.synced_at).toISOString(),
    kind: row.kind as SetChecklistKind,
    pokemonNames: row.pokemon_names,
  };
}

function toSetChecklistCard(row: SetCatalogCardRow, checklistId: string): SetChecklistCard {
  return {
    id: row.id,
    // No hay columna propia para esto (las cartas pertenecen al catálogo compartido, no a
    // un checklist concreto) — se etiqueta con el checklistId pedido, que es lo único que
    // el resto de la app lee de este campo (nunca se compara entre checklists distintos).
    checklistId,
    number: row.number,
    name: row.name,
    rarity: row.rarity,
    variant: row.variant as CardVariant,
    imageUrl: row.image_url,
    imageUrlLarge: row.image_url_large,
    referencePrice: row.reference_price !== null ? Number(row.reference_price) : null,
    setName: row.set_name,
    setTotalCards: row.set_total_cards,
  };
}

function countDistinctCards(cards: PokemonTcgCardData[]): number {
  // Por expansión+número (no solo número): un binder mezcla cartas de expansiones
  // distintas que pueden compartir el mismo número local sin ser la misma carta.
  return new Set(cards.map((c) => `${c.setName}::${c.number}`)).size;
}

/** Refresca los datos del catálogo compartido (borra+reinserta sus cartas, actualiza
 * nombre/total/fecha) — usado tanto por `resyncCatalog` (acotado a un usuario, que ya
 * comprobó que el checklist es suyo) como por el cron `refreshChecklistPrices.ts`, que
 * itera catálogos directamente sin ningún usuario de por medio. */
export async function refreshCatalogCards(pool: Pool, catalogId: string, input: ResyncCatalogInput): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("delete from set_catalog_cards where catalog_id = $1", [catalogId]);

    const totalCards = countDistinctCards(input.cards);
    await client.query("update set_catalogs set set_name = $1, total_cards = $2, synced_at = now() where id = $3", [
      input.setName,
      totalCards,
      catalogId,
    ]);

    for (const card of input.cards) {
      await client.query(
        `insert into set_catalog_cards
         (catalog_id, number, name, rarity, variant, image_url, image_url_large, reference_price, set_name, set_total_cards)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          catalogId,
          card.number,
          card.name,
          card.rarity,
          card.variant,
          card.imageUrl,
          card.imageUrlLarge,
          card.referencePrice,
          card.setName,
          card.setTotalCards,
        ],
      );
    }

    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Se construye acotado a un usuario concreto (`userId`) — mismo criterio que el resto de
 * repositorios. Un `set_checklists` es ahora un puntero ligero a un `set_catalogs`
 * compartido por TODOS los usuarios que hayan añadido ese mismo set/binder real: el JOIN
 * de arriba compone la forma pública de siempre, y `user_id` acota qué punteros son míos
 * — nunca filtra el catálogo en sí, que no tiene dueño. */
export function createSetChecklistRepository(pool: Pool, userId: string): SetChecklistRepository {
  async function selectComposed(where: string, params: unknown[]): Promise<SetChecklist | null> {
    const { rows } = await pool.query<ComposedRow>(`select ${COMPOSED_COLUMNS} ${COMPOSED_FROM} where ${where}`, params);
    return rows[0] ? toSetChecklist(rows[0]) : null;
  }

  return {
    async list() {
      const { rows } = await pool.query<ComposedRow>(
        `select ${COMPOSED_COLUMNS} ${COMPOSED_FROM} where sc.user_id = $1 order by sc.created_at desc`,
        [userId],
      );
      return rows.map(toSetChecklist);
    },

    async findById(id: string) {
      return selectComposed("sc.id = $1 and sc.user_id = $2", [id, userId]);
    },

    async findByExternalId(externalSetId: string) {
      return selectComposed("cat.external_set_id = $1 and sc.user_id = $2", [externalSetId, userId]);
    },

    async getCards(checklistId: string) {
      const { rows } = await pool.query<SetCatalogCardRow>(
        `select cc.id, cc.number, cc.name, cc.rarity, cc.variant, cc.image_url, cc.image_url_large,
                cc.reference_price, cc.set_name, cc.set_total_cards
         from set_catalog_cards cc
         join set_checklists sc on sc.catalog_id = cc.catalog_id
         where sc.id = $1 and sc.user_id = $2
         order by case when cc.number ~ '^\\d+$' then lpad(cc.number, 10, '0') else cc.number end`,
        [checklistId, userId],
      );
      return rows.map((row) => toSetChecklistCard(row, checklistId));
    },

    async findCatalogByExternalId(externalSetId: string) {
      const { rows } = await pool.query<{ id: string }>("select id from set_catalogs where external_set_id = $1", [externalSetId]);
      return rows[0] ?? null;
    },

    async createChecklistWithNewCatalog(input: NewCatalogInput): Promise<SetChecklist> {
      const client = await pool.connect();
      try {
        await client.query("begin");

        const totalCards = countDistinctCards(input.cards);
        const {
          rows: [catalog],
        } = await client.query<{ id: string }>(
          `insert into set_catalogs (external_set_id, set_name, total_cards, kind, pokemon_names)
           values ($1, $2, $3, $4, $5) returning id`,
          [input.externalSetId, input.setName, totalCards, input.kind, input.pokemonNames],
        );

        for (const card of input.cards) {
          await client.query(
            `insert into set_catalog_cards
             (catalog_id, number, name, rarity, variant, image_url, image_url_large, reference_price, set_name, set_total_cards)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              catalog.id,
              card.number,
              card.name,
              card.rarity,
              card.variant,
              card.imageUrl,
              card.imageUrlLarge,
              card.referencePrice,
              card.setName,
              card.setTotalCards,
            ],
          );
        }

        const {
          rows: [checklist],
        } = await client.query<{ id: string }>(
          "insert into set_checklists (user_id, catalog_id, set_name_es) values ($1, $2, $3) returning id",
          [userId, catalog.id, input.setNameEs],
        );

        await client.query("commit");
        return (await selectComposed("sc.id = $1 and sc.user_id = $2", [checklist.id, userId]))!;
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },

    async addChecklistToCatalog(catalogId: string, userSetNameEs: string | null): Promise<SetChecklist> {
      const {
        rows: [checklist],
      } = await pool.query<{ id: string }>(
        "insert into set_checklists (user_id, catalog_id, set_name_es) values ($1, $2, $3) returning id",
        [userId, catalogId, userSetNameEs],
      );
      return (await selectComposed("sc.id = $1 and sc.user_id = $2", [checklist.id, userId]))!;
    },

    async resyncCatalog(checklistId: string, input: ResyncCatalogInput): Promise<SetChecklist | null> {
      const { rows } = await pool.query<{ catalog_id: string }>(
        "select catalog_id from set_checklists where id = $1 and user_id = $2",
        [checklistId, userId],
      );
      const catalogId = rows[0]?.catalog_id;
      if (!catalogId) return null;

      await refreshCatalogCards(pool, catalogId, input);
      return selectComposed("sc.id = $1 and sc.user_id = $2", [checklistId, userId]);
    },
  };
}
