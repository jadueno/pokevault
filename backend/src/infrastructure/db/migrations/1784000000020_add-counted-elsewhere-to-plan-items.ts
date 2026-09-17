import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // "Invertido" del Resumen suma tanto el precio de referencia de los ítems del plan ya
  // hechos como el precio real de compra en collection_items/sealed_purchases — cuando el
  // mismo objeto físico queda registrado en los dos sitios (el caso normal: marcas "hecho"
  // el ítem del plan Y registras la compra real en Colección/Sellado para llevar el valor
  // de mercado), su coste se sumaba dos veces. Este flag, puesto a mano al vincular ambos
  // registros, saca el ítem del plan de esa suma sin tener que borrar su precio de
  // referencia (que sigue sirviendo de recordatorio de cuánto costó).
  pgm.addColumn("plan_items", {
    counted_elsewhere: { type: "boolean", notNull: true, default: false },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumn("plan_items", "counted_elsewhere");
}
