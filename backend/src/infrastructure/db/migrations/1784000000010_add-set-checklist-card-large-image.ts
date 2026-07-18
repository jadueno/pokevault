import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/** La miniatura de la rejilla usa `image_url` (baja resolución, rápida de cargar); al
 * hacer clic para ampliar hace falta una imagen más grande para que no se vea pixelada —
 * el proveedor ya la da en la misma respuesta (`images.large`), así que se guarda también
 * en vez de reescalar/adivinar la URL a partir de la pequeña. */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn("set_checklist_cards", { image_url_large: { type: "text" } });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn("set_checklist_cards", "image_url_large");
}
