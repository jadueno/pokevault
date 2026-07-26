import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Un checklist ya no tiene por qué ser un set oficial completo: también puede ser un
 * "binder" personalizado con todas las cartas de uno o varios Pokémon en concreto,
 * reunidas de todas las expansiones donde hayan salido (p. ej. "Slowpoke y Slowbro").
 * `kind` distingue ambos casos; `pokemon_names` guarda los nombres usados para poder
 * repetir la misma búsqueda al pulsar "Actualizar" (resync), igual que `external_set_id`
 * ya permite repetir la sincronización de un set oficial.
 *
 * Como un binder mezcla cartas de expansiones distintas, cada carta necesita saber de qué
 * expansión real viene — antes bastaba con el nombre del set a nivel de checklist entero
 * porque todas sus cartas pertenecían al mismo set. `set_total_cards` acompaña a
 * `set_name`: hace falta para reconstruir el "número/total" real de la carta en SU
 * expansión de origen al marcarla como propia (usar el total del binder entero daría un
 * denominador incorrecto, p. ej. "4/40" en vez de "4/102").
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn("set_checklists", {
    kind: { type: "text", notNull: true, default: "official" },
    pokemon_names: { type: "text[]" },
  });
  pgm.addColumn("set_checklist_cards", {
    set_name: { type: "text" },
    set_total_cards: { type: "integer" },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn("set_checklist_cards", ["set_name", "set_total_cards"]);
  pgm.dropColumn("set_checklists", ["kind", "pokemon_names"]);
}
