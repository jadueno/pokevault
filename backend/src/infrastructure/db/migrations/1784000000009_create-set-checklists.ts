import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Checklist de referencia de un set de TCG ("¿qué cartas tiene X set, y cuáles me
 * faltan?") — no es el catálogo externo que se quitó en la migración anterior. La
 * diferencia importante: esto no es una dependencia en vivo de la app (nunca se llama a
 * pokemontcg.io/Scrydex en una petición de usuario, que es justo el motivo por el que se
 * quitó el catálogo — ~45% de error y ~8s de latencia en ese proveedor). Se rellena con
 * un script puntual (`npm run sync:set-checklist`) que el usuario/agente ejecuta a mano
 * cuando quiere el checklist de un set nuevo, igual que las fotos de demo se descargaron
 * una vez en vez de servirse en vivo. `collection_items` no se vincula por FK — se
 * compara por número de carta en el frontend, porque `collection_items` es freeform y
 * puede tener el nombre en cualquier idioma.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("set_checklists", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    // Id del set en el proveedor de origen (p. ej. "me5" en pokemontcg.io), único para no
    // duplicar si se vuelve a sincronizar el mismo set.
    external_set_id: { type: "text", notNull: true, unique: true },
    // Nombre tal cual lo da el proveedor (normalmente en inglés, p. ej. "Pitch Black").
    set_name: { type: "text", notNull: true },
    // Alias en español que le pone el usuario (p. ej. "Oscuridad Absoluta") — el
    // proveedor no tiene nombres en español, así que esto se guarda a mano al
    // sincronizar, y es lo que se usa para relacionar con `collection_items.set_name`.
    set_name_es: { type: "text" },
    total_cards: { type: "integer", notNull: true },
    synced_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });

  pgm.createTable("set_checklist_cards", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    checklist_id: { type: "uuid", notNull: true, references: "set_checklists", onDelete: "CASCADE" },
    // Número dentro del set tal cual lo da el proveedor (p. ej. "1", "84") — se compara
    // con la parte numerador de collection_items.number ("1/120") en el frontend.
    number: { type: "text", notNull: true },
    name: { type: "text", notNull: true },
    rarity: { type: "text" },
    image_url: { type: "text" },
  });
  pgm.createIndex("set_checklist_cards", "checklist_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("set_checklist_cards");
  pgm.dropTable("set_checklists");
}
