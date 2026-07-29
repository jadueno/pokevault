import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Multi-tenant hizo que dos usuarios que sincronizan el MISMO set/binder real acaben con
 * dos copias completas e independientes de sus cartas (`set_checklist_cards` vía
 * `checklist_id`), cada una traída del proveedor por separado. Se separa lo que es
 * "verdad compartida del proveedor" (`set_catalogs`/`set_catalog_cards` — un catálogo por
 * `external_set_id` real, para TODA la instancia) de lo que es "puntero propio de un
 * usuario" (`set_checklists`, ahora ligero: solo id, user_id, catalog_id y su alias
 * personal `set_name_es`).
 *
 * `set_checklists.id` NO cambia de valor para ninguna fila existente (se sigue tratando la
 * MISMA tabla, solo se le añaden/quitan columnas) — collection_items.checklist_id depende
 * de eso y no se toca en esta migración.
 *
 * Sin baile de 3 pasos como la migración de usuarios: aquí no hace falta ningún secreto
 * externo, todo es SQL puro sobre datos ya presentes (ninguna migración anterior siembra
 * estas tablas con datos fijos, así que una BD nueva parte de 0 filas sin problema).
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable("set_catalogs", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    external_set_id: { type: "text", notNull: true, unique: true },
    set_name: { type: "text", notNull: true },
    total_cards: { type: "integer", notNull: true },
    synced_at: { type: "timestamptz", notNull: true, default: pgm.func("now()") },
    kind: { type: "text", notNull: true, default: "official" },
    pokemon_names: { type: "text[]" },
  });

  pgm.createTable("set_catalog_cards", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    catalog_id: { type: "uuid", notNull: true, references: "set_catalogs", onDelete: "CASCADE" },
    number: { type: "text", notNull: true },
    name: { type: "text", notNull: true },
    rarity: { type: "text" },
    image_url: { type: "text" },
    image_url_large: { type: "text" },
    reference_price: { type: "numeric(10,2)" },
    variant: { type: "text", notNull: true, default: "normal" },
    set_name: { type: "text" },
    set_total_cards: { type: "integer" },
  });
  pgm.createIndex("set_catalog_cards", "catalog_id");

  // Un catálogo por external_set_id real, quedándonos con los datos del checklist
  // sincronizado más recientemente si hubiera más de uno (no ocurre hoy: producción tiene
  // 2 filas de 1 usuario con external_set_id distintos).
  pgm.sql(`
    create temporary table _catalog_migration_map as
    select distinct on (sc.external_set_id)
      sc.id as old_checklist_id,
      gen_random_uuid() as new_catalog_id,
      sc.external_set_id, sc.set_name, sc.total_cards, sc.synced_at, sc.kind, sc.pokemon_names
    from set_checklists sc
    order by sc.external_set_id, sc.synced_at desc
  `);

  pgm.sql(`
    insert into set_catalogs (id, external_set_id, set_name, total_cards, synced_at, kind, pokemon_names)
    select new_catalog_id, external_set_id, set_name, total_cards, synced_at, kind, pokemon_names
    from _catalog_migration_map
  `);

  pgm.sql(`
    insert into set_catalog_cards
      (catalog_id, number, name, rarity, image_url, image_url_large, reference_price, variant, set_name, set_total_cards)
    select m.new_catalog_id, scc.number, scc.name, scc.rarity, scc.image_url, scc.image_url_large,
           scc.reference_price, scc.variant, scc.set_name, scc.set_total_cards
    from _catalog_migration_map m
    join set_checklist_cards scc on scc.checklist_id = m.old_checklist_id
  `);

  // Todas las filas de set_checklists con el mismo external_set_id apuntan al mismo
  // catálogo (deduplicado arriba), no solo la que se usó como "canónica".
  pgm.addColumn("set_checklists", {
    catalog_id: { type: "uuid", references: "set_catalogs" },
  });
  pgm.sql(`
    update set_checklists sc
    set catalog_id = m.new_catalog_id
    from _catalog_migration_map m
    where m.external_set_id = sc.external_set_id
  `);
  pgm.alterColumn("set_checklists", "catalog_id", { notNull: true });
  pgm.createIndex("set_checklists", "catalog_id");

  // "synced_at" pasa a significar "cuándo lo añadí yo" (no la frescura de los datos, que
  // ahora vive en set_catalogs.synced_at) — se conserva el valor histórico, solo cambia
  // el nombre/significado de la columna.
  pgm.renameColumn("set_checklists", "synced_at", "created_at");

  pgm.dropConstraint("set_checklists", "set_checklists_user_id_external_set_id_key");
  pgm.dropColumns("set_checklists", ["external_set_id", "set_name", "total_cards", "kind", "pokemon_names"]);
  pgm.addConstraint("set_checklists", "set_checklists_user_id_catalog_id_key", { unique: ["user_id", "catalog_id"] });

  pgm.dropTable("set_checklist_cards");
  pgm.sql("drop table _catalog_migration_map");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.renameColumn("set_checklists", "created_at", "synced_at");
  pgm.addColumns("set_checklists", {
    external_set_id: { type: "text" },
    set_name: { type: "text" },
    total_cards: { type: "integer" },
    kind: { type: "text", notNull: true, default: "official" },
    pokemon_names: { type: "text[]" },
  });
  pgm.sql(`
    update set_checklists sc
    set external_set_id = c.external_set_id, set_name = c.set_name, total_cards = c.total_cards,
        kind = c.kind, pokemon_names = c.pokemon_names
    from set_catalogs c
    where c.id = sc.catalog_id
  `);
  pgm.alterColumn("set_checklists", "external_set_id", { notNull: true });
  pgm.alterColumn("set_checklists", "set_name", { notNull: true });
  pgm.alterColumn("set_checklists", "total_cards", { notNull: true });

  pgm.dropConstraint("set_checklists", "set_checklists_user_id_catalog_id_key");
  pgm.addConstraint("set_checklists", "set_checklists_user_id_external_set_id_key", {
    unique: ["user_id", "external_set_id"],
  });

  pgm.createTable("set_checklist_cards", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    checklist_id: { type: "uuid", notNull: true, references: "set_checklists", onDelete: "CASCADE" },
    number: { type: "text", notNull: true },
    name: { type: "text", notNull: true },
    rarity: { type: "text" },
    image_url: { type: "text" },
    image_url_large: { type: "text" },
    reference_price: { type: "numeric(10,2)" },
    variant: { type: "text", notNull: true, default: "normal" },
    set_name: { type: "text" },
    set_total_cards: { type: "integer" },
  });
  pgm.createIndex("set_checklist_cards", "checklist_id");
  // Re-expande: cada checklist (uno por usuario) recupera su propia copia de las cartas
  // del catálogo compartido que tuviera en ese momento. Tiene que ir ANTES de borrar
  // `catalog_id` de set_checklists, ya que este join lo necesita.
  pgm.sql(`
    insert into set_checklist_cards
      (checklist_id, number, name, rarity, image_url, image_url_large, reference_price, variant, set_name, set_total_cards)
    select sc.id, cc.number, cc.name, cc.rarity, cc.image_url, cc.image_url_large, cc.reference_price,
           cc.variant, cc.set_name, cc.set_total_cards
    from set_checklists sc
    join set_catalog_cards cc on cc.catalog_id = sc.catalog_id
  `);

  pgm.dropColumn("set_checklists", "catalog_id");
  pgm.dropTable("set_catalog_cards");
  pgm.dropTable("set_catalogs");
}
