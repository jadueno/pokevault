import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/** Precio de referencia de Cardmarket (EUR), viene en la misma respuesta que ya se usa
 * para traer las cartas de un set — no hace falta ninguna llamada extra al sincronizar.
 * Sin conversión de divisa ni fallback a tcgplayer/USD: si el proveedor no da precio de
 * Cardmarket para una carta (p. ej. sets recién salidos, sin datos de mercado aún), se
 * deja en blanco antes que mentir con una cifra en otra divisa. */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn("set_checklist_cards", { reference_price: { type: "numeric(10,2)" } });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn("set_checklist_cards", "reference_price");
}
