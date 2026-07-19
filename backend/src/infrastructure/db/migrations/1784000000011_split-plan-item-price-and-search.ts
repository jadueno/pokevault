import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * El precio de referencia y el término de búsqueda de un ítem del plan vivían como texto
 * embebido en `description` (p. ej. "... (ref. ~59 €) — buscar: "ETB X Español""),
 * parseados con regex en el frontend para poder resaltarlos y sumarlos. Pasan a ser
 * columnas propias, editables como cualquier otro campo — nada de regex en tiempo de
 * lectura. Esta migración añade las columnas y, en el mismo paso, reparte los datos ya
 * reales del usuario: extrae precio/término de la descripción de cada fila existente,
 * los mueve a las columnas nuevas y deja `description` limpia (sin esos fragmentos).
 * Es una migración de datos real (no solo de esquema) porque el plan ya tiene meses de
 * uso — mismo motivo por el que `1784000000006_seed-plan` sembró el plan real en vez de
 * dejar la tabla vacía.
 */

const REF_PRICE_RE = /\(ref\.[^)]*\)/i;
const SEARCH_TERM_RE = /—\s*buscar:\s*"([^"]+)"/i;

function extractFields(description: string): { description: string; referencePrice: number | null; searchTerm: string | null } {
  const refMatch = description.match(REF_PRICE_RE);
  let referencePrice: number | null = null;
  if (refMatch) {
    const numbers = refMatch[0].match(/\d+(?:[.,]\d+)?/g);
    if (numbers && numbers.length > 0) {
      const values = numbers
        .slice(0, 2)
        .map((n) => Number(n.replace(",", ".")))
        .filter((n) => !Number.isNaN(n));
      if (values.length > 0) referencePrice = values.reduce((sum, n) => sum + n, 0) / values.length;
    }
  }

  const searchMatch = description.match(SEARCH_TERM_RE);
  const searchTerm = searchMatch ? searchMatch[1] : null;

  let cleaned = description;
  if (refMatch) cleaned = cleaned.replace(refMatch[0], "");
  if (searchMatch) cleaned = cleaned.replace(searchMatch[0], "");
  cleaned = cleaned
    .replace(/\s{2,}/g, " ")
    .replace(/\s*—\s*—\s*/g, " — ")
    .replace(/^\s*—\s*/, "")
    .replace(/\s*—\s*$/, "")
    .trim();

  return { description: cleaned, referencePrice, searchTerm };
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  // pgm.addColumns() es declarativo (solo se aplica al final de up(), después de que esta
  // función termine) — hace falta que la columna exista YA para poder rellenarla con datos
  // reales más abajo en esta misma función, así que se ejecuta la DDL de forma inmediata
  // con pgm.db.query en vez de con el helper declarativo.
  await pgm.db.query("alter table plan_items add column reference_price numeric(10,2), add column search_term text");

  const rows = await pgm.db.select("select id, description from plan_items");
  for (const row of rows as { id: string; description: string }[]) {
    const { description, referencePrice, searchTerm } = extractFields(row.description);
    if (description === row.description && referencePrice === null && searchTerm === null) continue;
    await pgm.db.query("update plan_items set description = $1, reference_price = $2, search_term = $3 where id = $4", [
      description,
      referencePrice,
      searchTerm,
      row.id,
    ]);
  }
}

/** No se deshace: reconstruir el texto embebido a partir de las columnas separadas no
 * reproduciría el formato original exacto, y no tiene sentido volver a un formato peor. */
export async function down(): Promise<void> {
  throw new Error("Esta migración no tiene vuelta atrás: el precio/término pasan a ser campos propios a propósito.");
}
