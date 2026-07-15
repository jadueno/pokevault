import type { ColumnDefinitions, MigrationBuilder } from "node-pg-migrate";

export const shorthands: ColumnDefinitions | undefined = undefined;

type Category = "comprar" | "abrir" | "guardar_sellado";

interface PlanItemSeed {
  month: string;
  category: Category;
  description: string;
}

// Plan de compra real del usuario, agosto 2026 - julio 2027 (presupuesto 150 €/mes).
const ITEMS: PlanItemSeed[] = [
  // 2026-08
  { month: "2026-08", category: "comprar", description: "Archivador Vault X 12 bolsillos (480 cartas)" },
  { month: "2026-08", category: "comprar", description: "100 Penny Sleeves Ultra Pro" },
  { month: "2026-08", category: "comprar", description: "25 Top Loaders Ultra Pro" },
  { month: "2026-08", category: "comprar", description: "1x ETB Megaevolución - Oscuridad Absoluta (ES)" },
  { month: "2026-08", category: "comprar", description: "1x Booster Bundle Megaevolución - Oscuridad Absoluta (ES)" },
  { month: "2026-08", category: "abrir", description: "ETB Megaevolución - Oscuridad Absoluta" },
  { month: "2026-08", category: "abrir", description: "Booster Bundle Megaevolución - Oscuridad Absoluta" },

  // 2026-09
  { month: "2026-09", category: "comprar", description: "1x Booster Bundle Megaevolución - Equilibrio Perfecto (ES)" },
  { month: "2026-09", category: "comprar", description: "5x Illustration Rare (IR) en español" },
  {
    month: "2026-09",
    category: "comprar",
    description: "1x Carta especial de Pikachu, Gengar, Mew, Dragonite, Lugia o Charizard (máx. 40 €)",
  },
  { month: "2026-09", category: "abrir", description: "Booster Bundle Megaevolución - Equilibrio Perfecto" },

  // 2026-10
  { month: "2026-10", category: "comprar", description: "9x Illustration Rare para completar una página temática" },

  // 2026-11
  { month: "2026-11", category: "comprar", description: "1x ETB Mascarada Crepuscular (ES)" },
  { month: "2026-11", category: "comprar", description: "3x Illustration Rare de Mascarada Crepuscular" },
  { month: "2026-11", category: "comprar", description: "1x Carta especial de Gengar o Mew" },
  { month: "2026-11", category: "abrir", description: "ETB Mascarada Crepuscular" },

  // 2026-12
  { month: "2026-12", category: "comprar", description: "1x Carta premium (80-120 €)" },
  { month: "2026-12", category: "comprar", description: "2x Illustration Rare" },
  { month: "2026-12", category: "comprar", description: "1x Soporte acrílico para carta" },

  // 2027-01
  { month: "2027-01", category: "comprar", description: "1x Booster Bundle de tu expansión favorita" },
  { month: "2027-01", category: "comprar", description: "4x Illustration Rare" },
  { month: "2027-01", category: "comprar", description: "100 Penny Sleeves" },
  { month: "2027-01", category: "comprar", description: "25 Top Loaders" },
  { month: "2027-01", category: "abrir", description: "Booster Bundle" },

  // 2027-02
  { month: "2027-02", category: "comprar", description: "1x Colección Pokémon Day (si sale una nueva)" },
  { month: "2027-02", category: "comprar", description: "1x Promo Pikachu" },
  { month: "2027-02", category: "comprar", description: "5x Illustration Rare" },
  { month: "2027-02", category: "abrir", description: "Colección Pokémon Day" },
  {
    month: "2027-02",
    category: "guardar_sellado",
    description: "Solo una segunda unidad si la encuentras a PVP oficial",
  },

  // 2027-03
  { month: "2027-03", category: "comprar", description: "Dratini Illustration Rare" },
  { month: "2027-03", category: "comprar", description: "Dragonair Illustration Rare" },
  { month: "2027-03", category: "comprar", description: "Dragonite Illustration Rare" },
  { month: "2027-03", category: "comprar", description: "Rayquaza Illustration Rare" },
  { month: "2027-03", category: "comprar", description: "Gible Illustration Rare" },
  { month: "2027-03", category: "comprar", description: "Latios o Latias Illustration Rare" },

  // 2027-04
  { month: "2027-04", category: "comprar", description: "1x ETB de tu expansión favorita" },
  { month: "2027-04", category: "comprar", description: "Caja protectora para ETB" },
  { month: "2027-04", category: "comprar", description: "3x Illustration Rare" },
  { month: "2027-04", category: "guardar_sellado", description: "ETB completa (NO ABRIR)" },

  // 2027-05
  { month: "2027-05", category: "comprar", description: "1x Carta graduada PSA 9 / CGC 9 / BGS 9" },
  { month: "2027-05", category: "comprar", description: "Soporte para carta graduada" },

  // 2027-06
  { month: "2027-06", category: "comprar", description: "9x Illustration Rare de temática cotidiana" },

  // 2027-07
  { month: "2027-07", category: "comprar", description: "2x Booster Bundle de la nueva expansión" },
  { month: "2027-07", category: "comprar", description: '1x Carta "Holy Grail" (máx. 150 €)' },
  { month: "2027-07", category: "abrir", description: "1 Booster Bundle" },
  { month: "2027-07", category: "guardar_sellado", description: "1 Booster Bundle" },
];

const YEAR_RULES = `Abrir siempre:
- ETB del mes (salvo la de abril)
- Booster Bundle destinado a abrir
- Colecciones especiales compradas para disfrutar

Guardar siempre:
- ETB de abril
- Booster Bundle de julio
- Cualquier ETB o Booster Bundle extra que consigas a precio oficial

No guardar:
- Sobres sueltos
- Blisters de 1 sobre
- Mini Tins
- Latas normales
- Productos muy inflados de precio`;

const YEAR_GOAL = `- 1 archivador premium
- 60-100 cartas seleccionadas
- 20-30 Illustration Rare
- Varias Special Illustration Rare
- 1 carta graduada
- 1 ETB sellada
- 1 Booster Bundle sellado
- Varias cartas premium de tus Pokémon favoritos`;

function esc(value: string): string {
  return value.replace(/'/g, "''");
}

/** Siembra el plan real del usuario, pero solo la primera vez (tabla nueva y vacía) —
 * si ya se han editado los ítems a mano, volver a correr migraciones no los duplica. */
export async function up(pgm: MigrationBuilder): Promise<void> {
  const positionByGroup = new Map<string, number>();
  const values = ITEMS.map((item) => {
    const groupKey = `${item.month}:${item.category}`;
    const position = positionByGroup.get(groupKey) ?? 0;
    positionByGroup.set(groupKey, position + 1);
    return `('${esc(item.month)}', '${esc(item.category)}', '${esc(item.description)}', ${position})`;
  }).join(",\n      ");

  pgm.sql(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM plan_items) THEN
        INSERT INTO plan_items (month, category, description, position)
        VALUES
      ${values};
      END IF;

      IF NOT EXISTS (SELECT 1 FROM plan_settings) THEN
        INSERT INTO plan_settings (monthly_budget, year_rules, year_goal)
        VALUES (150.00, '${esc(YEAR_RULES)}', '${esc(YEAR_GOAL)}');
      END IF;
    END $$;
  `);
}

/** No se deshace: revertir borraría ediciones reales que el usuario ya haya hecho sobre el plan. */
export async function down(): Promise<void> {}
