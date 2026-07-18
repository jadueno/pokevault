import type { Pool } from "pg";
import type { SetChecklist, SetChecklistCard } from "../../../domain/types.js";
import type { SetChecklistRepository } from "../../../domain/ports.js";

interface SetChecklistRow {
  id: string;
  external_set_id: string;
  set_name: string;
  set_name_es: string | null;
  total_cards: number;
  synced_at: string;
}

interface SetChecklistCardRow {
  id: string;
  checklist_id: string;
  number: string;
  name: string;
  rarity: string | null;
  image_url: string | null;
}

function toSetChecklist(row: SetChecklistRow): SetChecklist {
  return {
    id: row.id,
    externalSetId: row.external_set_id,
    setName: row.set_name,
    setNameEs: row.set_name_es,
    totalCards: row.total_cards,
    syncedAt: new Date(row.synced_at).toISOString(),
  };
}

function toSetChecklistCard(row: SetChecklistCardRow): SetChecklistCard {
  return {
    id: row.id,
    checklistId: row.checklist_id,
    number: row.number,
    name: row.name,
    rarity: row.rarity,
    imageUrl: row.image_url,
  };
}

export function createSetChecklistRepository(pool: Pool): SetChecklistRepository {
  return {
    async list() {
      const { rows } = await pool.query<SetChecklistRow>(
        `select id, external_set_id, set_name, set_name_es, total_cards, synced_at
         from set_checklists order by synced_at desc`,
      );
      return rows.map(toSetChecklist);
    },

    async getCards(checklistId: string) {
      const { rows } = await pool.query<SetChecklistCardRow>(
        `select id, checklist_id, number, name, rarity, image_url
         from set_checklist_cards where checklist_id = $1
         -- Los números puramente numéricos se ordenan como número (con padding para que
         -- el orden alfabético de texto no ponga "10" antes que "2"); los que llevan
         -- letras (p. ej. "TG01") se quedan con orden alfabético tal cual.
         order by case when number ~ '^\\d+$' then lpad(number, 10, '0') else number end`,
        [checklistId],
      );
      return rows.map(toSetChecklistCard);
    },
  };
}
