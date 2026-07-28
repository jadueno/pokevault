import type { CollectionItem } from "../../domain/types";
import { collectionLanguageDistribution, collectionRarityDistribution, formatMoney, mostValuableItem } from "../../domain/calculations";
import { Card } from "../../components/Card";
import { SectionLabel } from "../../components/SectionLabel";
import { LANGUAGE_LABELS } from "../coleccion/ItemCard";

// Como máximo estas filas por lista: con una colección grande la cola de rarezas/idiomas
// con 1 sola carta no aporta nada y solo alarga la tarjeta — "y N más" resume el resto.
const MAX_ROWS = 5;

function DistributionList({ title, entries, labelOf }: { title: string; entries: { key: string; count: number }[]; labelOf: (key: string) => string }) {
  const shown = entries.slice(0, MAX_ROWS);
  const rest = entries.length - shown.length;
  const max = shown[0]?.count ?? 1;

  return (
    <div>
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-2 flex flex-col gap-2">
        {shown.map((entry) => (
          <div key={entry.key} className="flex items-center gap-2 text-sm">
            <span className="w-20 shrink-0 truncate text-[var(--text-secondary)]">{labelOf(entry.key)}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--gridline)]">
              <div className="h-full rounded-full bg-[var(--beacon)]" style={{ width: `${(entry.count / max) * 100}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right tabular-nums text-[var(--text-muted)]">{entry.count}</span>
          </div>
        ))}
      </div>
      {rest > 0 && <p className="mt-1.5 text-xs text-[var(--text-muted)]">y {rest} más</p>}
      {entries.length === 0 && <p className="mt-1.5 text-xs text-[var(--text-muted)]">Sin datos todavía.</p>}
    </div>
  );
}

export function CollectionStatsCard({ items }: { items: CollectionItem[] }) {
  const best = mostValuableItem(items);
  const rarity = collectionRarityDistribution(items);
  const language = collectionLanguageDistribution(items);

  return (
    <Card className="flex flex-col gap-5">
      <SectionLabel>Estadísticas de la colección</SectionLabel>

      <div>
        <p className="text-xs font-semibold text-[var(--text-muted)]">Carta más valiosa</p>
        {best ? (
          <div className="mt-1.5 flex items-center gap-3">
            {best.photo ? (
              <img src={best.photo} alt={best.name} className="h-14 w-10 rounded-lg object-cover shadow-card" />
            ) : (
              <div aria-hidden="true" className="flex h-14 w-10 items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-lg">
                🎴
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">{best.name}</p>
              {best.setName && <p className="truncate text-xs text-[var(--text-muted)]">{best.setName}</p>}
              <p className="font-semibold text-[var(--amber)]">{formatMoney(best.estimatedValueOverride)}</p>
            </div>
          </div>
        ) : (
          <p className="mt-1.5 text-sm text-[var(--text-muted)]">Todavía no hay ninguna carta con valor estimado.</p>
        )}
      </div>

      <DistributionList title="Por rareza" entries={rarity} labelOf={(key) => key} />
      <DistributionList title="Por idioma" entries={language} labelOf={(key) => LANGUAGE_LABELS[key] ?? key} />
    </Card>
  );
}
