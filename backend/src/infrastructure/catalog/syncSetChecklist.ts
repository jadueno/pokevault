import "dotenv/config";
import { pool } from "../db/pool.js";

/**
 * Trae el listado de cartas de un set desde pokemontcg.io/Scrydex UNA VEZ y lo guarda en
 * `set_checklists`/`set_checklist_cards`, para poder mostrar "qué me falta de este set"
 * sin depender de esa API en cada visita — el catálogo en vivo se quitó de la app
 * precisamente porque ese proveedor tiene ~45% de error y ~8s de latencia media (ver
 * ARCHITECTURE.md). Esto es un script puntual, como `seedDemoData.ts`, no un servicio.
 *
 * Uso: npm run sync:set-checklist -- me5 "Oscuridad Absoluta"
 *   (el id del set, p. ej. "me5", se saca de https://api.pokemontcg.io/v2/sets)
 *
 * Si se vuelve a sincronizar el mismo `externalSetId`, se borra el checklist anterior y
 * se reemplaza entero (evita ir acumulando cartas duplicadas o desactualizadas).
 */

interface PokemonTcgCard {
  number: string;
  name: string;
  rarity?: string;
  images?: { small?: string; large?: string };
}

interface PokemonTcgSet {
  id: string;
  name: string;
  total: number;
}

const API_BASE = "https://api.pokemontcg.io/v2";

async function fetchJson<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (process.env.POKEMON_TCG_API_KEY) headers["X-Api-Key"] = process.env.POKEMON_TCG_API_KEY;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchSet(externalSetId: string): Promise<PokemonTcgSet> {
  const { data } = await fetchJson<{ data: PokemonTcgSet }>(`${API_BASE}/sets/${externalSetId}`);
  return data;
}

async function fetchAllCards(externalSetId: string): Promise<PokemonTcgCard[]> {
  const cards: PokemonTcgCard[] = [];
  let page = 1;
  for (;;) {
    const { data } = await fetchJson<{ data: PokemonTcgCard[] }>(
      `${API_BASE}/cards?q=set.id:${externalSetId}&pageSize=250&page=${page}`,
    );
    cards.push(...data);
    if (data.length < 250) break;
    page++;
  }
  return cards;
}

async function main() {
  const [externalSetId, setNameEs] = process.argv.slice(2);
  if (!externalSetId) {
    console.error('Uso: npm run sync:set-checklist -- <externalSetId> ["Nombre en español"]');
    process.exit(1);
  }

  console.log(`Consultando el set "${externalSetId}" en pokemontcg.io…`);
  const set = await fetchSet(externalSetId);
  const cards = await fetchAllCards(externalSetId);
  console.log(`"${set.name}" — ${cards.length} cartas encontradas.`);

  const client = await pool.connect();
  try {
    await client.query("begin");

    // Reemplazo completo si ya existía (cascade se lleva por delante las cartas viejas).
    await client.query("delete from set_checklists where external_set_id = $1", [externalSetId]);

    const { rows } = await client.query<{ id: string }>(
      `insert into set_checklists (external_set_id, set_name, set_name_es, total_cards)
       values ($1, $2, $3, $4) returning id`,
      [externalSetId, set.name, setNameEs ?? null, cards.length],
    );
    const checklistId = rows[0].id;

    for (const card of cards) {
      await client.query(
        `insert into set_checklist_cards (checklist_id, number, name, rarity, image_url)
         values ($1, $2, $3, $4, $5)`,
        [checklistId, card.number, card.name, card.rarity ?? null, card.images?.small ?? null],
      );
    }

    await client.query("commit");
    console.log(`Guardado. ${cards.length} cartas de "${set.name}"${setNameEs ? ` (${setNameEs})` : ""} listas para el checklist.`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("No se ha podido sincronizar el checklist:", error instanceof Error ? error.message : error);
  process.exit(1);
});
