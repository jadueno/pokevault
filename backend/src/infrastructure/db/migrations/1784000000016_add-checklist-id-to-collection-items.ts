import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

/**
 * Bug real encontrado en producción (2026-07): un binder reúne cartas de cualquier
 * expansión donde el Pokémon haya salido, así que si esa expansión también está
 * sincronizada como set oficial aparte, la misma carta (número+variante) aparece en las
 * dos listas. `computeSetChecklistCompletion`/`findOwnedCollectionItemIds` (ver
 * `src/domain/calculations.ts`) comparaban por número+variante+nombre de set aproximado
 * sobre TODA la colección, sin importar desde qué checklist se marcó — así que marcar una
 * carta como tuya en un checklist la marcaba automáticamente como tuya en cualquier otro
 * que compartiera esa misma carta (caso real: Slowbro/Slowpoke de "Oscuridad Absoluta",
 * presentes tanto en el set oficial como en el binder "Slowpoke y Slowbro").
 *
 * `checklist_id` es nullable a propósito: los ejemplares dados de alta a mano (fuera de
 * "Marcar como mía" en un checklist) no pertenecen a ninguno, y siguen comparándose por el
 * criterio de texto de siempre (fallback en el propio `calculations.ts`) — solo los que sí
 * vienen de un checklist quedan aislados entre sí a partir de ahora.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumn("collection_items", {
    checklist_id: { type: "uuid", references: "set_checklists", onDelete: "SET NULL" },
  });
  pgm.createIndex("collection_items", "checklist_id");
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn("collection_items", ["checklist_id"]);
}
