import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Espejo local del catálogo externo (pokemontcg.io, o quien lo sustituya el día que
 * haga falta). Se cachea a propósito: la búsqueda del usuario necesita filtros
 * combinados y ordenar por precio sin depender de la disponibilidad ni del rate limit
 * de una API de terceros en cada tecleo — la sincronización (ver syncCatalog.ts) es lo
 * único que llama al proveedor externo.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("catalog_sets", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    // "provider" desacopla nuestro id interno del externo: si algún día hay que migrar
    // de pokemontcg.io a otro proveedor (riesgo real, ver ARCHITECTURE.md), conviven
    // sin colisión de ids.
    provider: { type: "text", notNull: true },
    external_id: { type: "text", notNull: true },
    name: { type: "text", notNull: true },
    series: { type: "text" },
    printed_total: { type: "integer" },
    total: { type: "integer" },
    // "text" en vez de "date" a propósito: leer una columna `date` de vuelta con `pg` y
    // pasarla por `new Date(...).toISOString()` desplaza el día según la zona horaria del
    // proceso (gotcha ya conocido en esta familia de proyectos). Formato "YYYY-MM-DD".
    release_date: { type: "text" },
    symbol_url: { type: "text" },
    logo_url: { type: "text" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.addConstraint("catalog_sets", "catalog_sets_provider_external_id_key", {
    unique: ["provider", "external_id"],
  });

  pgm.createTable("catalog_cards", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    provider: { type: "text", notNull: true },
    external_id: { type: "text", notNull: true },
    set_id: { type: "uuid", notNull: true, references: "catalog_sets", onDelete: "CASCADE" },
    name: { type: "text", notNull: true },
    number: { type: "text", notNull: true },
    rarity: { type: "text" },
    artist: { type: "text" },
    supertype: { type: "text", notNull: true },
    subtypes: { type: "text[]", notNull: true, default: "{}" },
    types: { type: "text[]", notNull: true, default: "{}" },
    image_small_url: { type: "text" },
    image_large_url: { type: "text" },
    current_price: { type: "numeric(10,2)" },
    current_price_currency: { type: "text" },
    price_updated_at: { type: "timestamptz" },
    price_source: { type: "text" },
    // Payload íntegro del proveedor: red de seguridad para campos que aún no se han
    // modelado explícitamente, sin tener que migrar el esquema para leerlos.
    raw_data: { type: "jsonb" },
    created_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    updated_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
  });
  pgm.addConstraint("catalog_cards", "catalog_cards_provider_external_id_key", {
    unique: ["provider", "external_id"],
  });
  pgm.createIndex("catalog_cards", "set_id");
  pgm.createIndex("catalog_cards", "rarity");
  pgm.sql(`create index catalog_cards_name_lower_idx on catalog_cards (lower(name))`);

  pgm.createTable("catalog_sync_log", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    provider: { type: "text", notNull: true },
    started_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    finished_at: { type: "timestamptz" },
    // 'running' | 'success' | 'failed' — validado en application/, no aquí (mismo
    // criterio que el resto de la familia para catálogos cerrados pequeños).
    status: { type: "text", notNull: true, default: "running" },
    sets_synced: { type: "integer" },
    cards_synced: { type: "integer" },
    error: { type: "text" },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable("catalog_sync_log");
  pgm.dropTable("catalog_cards");
  pgm.dropTable("catalog_sets");
}
