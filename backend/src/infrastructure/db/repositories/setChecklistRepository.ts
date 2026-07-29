import type { Pool } from "pg";
import type { CardVariant, SetChecklist, SetChecklistCard, SetChecklistKind } from "../../../domain/types.js";
import type { SetChecklistRepository, UpsertChecklistInput } from "../../../domain/ports.js";

interface SetChecklistRow {
  id: string;
  external_set_id: string;
  set_name: string;
  set_name_es: string | null;
  total_cards: number;
  synced_at: string;
  kind: string;
  pokemon_names: string[] | null;
}

interface SetChecklistCardRow {
  id: string;
  checklist_id: string;
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

function toSetChecklist(row: SetChecklistRow): SetChecklist {
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

function toSetChecklistCard(row: SetChecklistCardRow): SetChecklistCard {
  return {
    id: row.id,
    checklistId: row.checklist_id,
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

/** Se construye acotado a un usuario concreto (`userId`) — mismo criterio que el resto de
 * repositorios. `set_checklist_cards` no tiene `user_id` propio (su pertenencia es
 * transitiva vía `checklist_id`), así que `getCards` necesita un JOIN contra
 * `set_checklists` para comprobar el dueño — sin él, cualquier usuario autenticado podría
 * leer las cartas de un checklist ajeno solo conociendo/adivinando su id. */
export function createSetChecklistRepository(pool: Pool, userId: string): SetChecklistRepository {
  return {
    async list() {
      const { rows } = await pool.query<SetChecklistRow>(
        `select id, external_set_id, set_name, set_name_es, total_cards, synced_at, kind, pokemon_names
         from set_checklists where user_id = $1 order by synced_at desc`,
        [userId],
      );
      return rows.map(toSetChecklist);
    },

    async findById(id: string) {
      const { rows } = await pool.query<SetChecklistRow>(
        `select id, external_set_id, set_name, set_name_es, total_cards, synced_at, kind, pokemon_names
         from set_checklists where id = $1 and user_id = $2`,
        [id, userId],
      );
      return rows[0] ? toSetChecklist(rows[0]) : null;
    },

    async findByExternalId(externalSetId: string) {
      const { rows } = await pool.query<SetChecklistRow>(
        `select id, external_set_id, set_name, set_name_es, total_cards, synced_at, kind, pokemon_names
         from set_checklists where external_set_id = $1 and user_id = $2`,
        [externalSetId, userId],
      );
      return rows[0] ? toSetChecklist(rows[0]) : null;
    },

    async getCards(checklistId: string) {
      const { rows } = await pool.query<SetChecklistCardRow>(
        `select scc.id, scc.checklist_id, scc.number, scc.name, scc.rarity, scc.variant, scc.image_url,
                scc.image_url_large, scc.reference_price, scc.set_name, scc.set_total_cards
         from set_checklist_cards scc
         join set_checklists sc on sc.id = scc.checklist_id
         where scc.checklist_id = $1 and sc.user_id = $2
         -- Los números puramente numéricos se ordenan como número (con padding para que
         -- el orden alfabético de texto no ponga "10" antes que "2"); los que llevan
         -- letras (p. ej. "TG01") se quedan con orden alfabético tal cual.
         order by case when scc.number ~ '^\\d+$' then lpad(scc.number, 10, '0') else scc.number end`,
        [checklistId, userId],
      );
      return rows.map(toSetChecklistCard);
    },

    async upsertChecklist(input: UpsertChecklistInput): Promise<SetChecklist> {
      const client = await pool.connect();
      try {
        await client.query("begin");

        // Reemplazo completo: tanto al sincronizar un set nuevo como al "Actualizar" uno
        // ya existente (cascade se lleva las cartas viejas por delante). Acotado también
        // por user_id: cada usuario sincroniza el mismo set real de forma independiente.
        await client.query("delete from set_checklists where external_set_id = $1 and user_id = $2", [input.externalSetId, userId]);

        // Cartas distintas (una por expansión+número), no filas de variante: una misma
        // carta con normal+reverso aporta dos filas a set_checklist_cards pero sigue
        // siendo una sola carta a efectos de "cuántas cartas tiene esto". Se cuenta por
        // expansión+número (no solo número) porque un binder mezcla cartas de expansiones
        // distintas que pueden compartir el mismo número local sin ser la misma carta.
        const totalCards = new Set(input.cards.map((c) => `${c.setName}::${c.number}`)).size;

        const { rows } = await client.query<SetChecklistRow>(
          `insert into set_checklists (user_id, external_set_id, set_name, set_name_es, total_cards, kind, pokemon_names)
           values ($1, $2, $3, $4, $5, $6, $7)
           returning id, external_set_id, set_name, set_name_es, total_cards, synced_at, kind, pokemon_names`,
          [userId, input.externalSetId, input.setName, input.setNameEs, totalCards, input.kind, input.pokemonNames],
        );
        const checklist = rows[0];

        for (const card of input.cards) {
          await client.query(
            `insert into set_checklist_cards
             (checklist_id, number, name, rarity, variant, image_url, image_url_large, reference_price,
              set_name, set_total_cards)
             values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              checklist.id,
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
        return toSetChecklist(checklist);
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
