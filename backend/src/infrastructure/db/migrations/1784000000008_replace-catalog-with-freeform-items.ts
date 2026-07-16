import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Se quita el catálogo sincronizado de pokemontcg.io: el usuario no navega un catálogo
 * externo, hace una foto a lo que compra y la app reconoce los datos (ver
 * VisualMatchProvider). collection_items/wishlist_items dejan de apuntar a una carta de
 * catálogo (catalog_card_id) y pasan a guardar sus propios datos directamente, más la
 * foto que dio origen al alta. Sin precio de mercado automático — el valor se estima a
 * mano, mismo patrón que ya usaba el producto sellado (que nunca tuvo precio de catálogo).
 *
 * Tablas vacías en el momento de este cambio (sin usuarios reales todavía), así que no
 * hace falta backfill de las columnas nuevas notNull.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn("collection_items", "catalog_card_id");
  pgm.addColumns("collection_items", {
    name: { type: "text", notNull: true },
    set_name: { type: "text" },
    number: { type: "text" },
    rarity: { type: "text" },
    // Data URL de la foto que dio origen al alta (o a la que se usó para reconocerla).
    photo: { type: "text" },
  });

  pgm.dropConstraint("wishlist_items", "wishlist_items_catalog_card_id_key");
  pgm.dropColumn("wishlist_items", "catalog_card_id");
  pgm.addColumns("wishlist_items", {
    name: { type: "text", notNull: true },
    set_name: { type: "text" },
    photo: { type: "text" },
  });

  pgm.dropColumn("sealed_purchases", "catalog_set_id");
  pgm.addColumn("sealed_purchases", { photo: { type: "text" } });

  pgm.dropTable("catalog_sync_log");
  pgm.dropTable("catalog_cards");
  pgm.dropTable("catalog_sets");
}

/** No se deshace: catalog_sets/catalog_cards se volverían a crear vacías (había que
 * resincronizar de todos modos) y no tiene sentido recuperar columnas que ya no se usan. */
export async function down(): Promise<void> {
  throw new Error("Esta migración no tiene vuelta atrás: el catálogo se elimina a propósito.");
}
