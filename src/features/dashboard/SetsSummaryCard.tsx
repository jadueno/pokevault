import type { CollectionItem, SetChecklist, SetChecklistCard } from "../../domain/types";
import { formatMoney, summarizeChecklistCompletion } from "../../domain/calculations";
import { Card } from "../../components/Card";
import { SectionLabel } from "../../components/SectionLabel";

export function SetsSummaryCard({
  checklists,
  cardsByChecklist,
  collectionItems,
}: {
  checklists: SetChecklist[];
  cardsByChecklist: Record<string, SetChecklistCard[]>;
  collectionItems: CollectionItem[];
}) {
  if (checklists.length === 0) return null;

  const summaries = summarizeChecklistCompletion(checklists, cardsByChecklist, collectionItems);
  // Más cerca de completarse primero: responde "¿en cuál me merece más la pena centrarme
  // ahora?" mejor que el orden de sincronización.
  const sorted = [...summaries].sort((a, b) => b.pct - a.pct);
  const totalMissingCost = summaries.reduce((sum, s) => sum + s.missingCost, 0);
  const totalMissingWithoutPrice = summaries.reduce((sum, s) => sum + s.missingWithoutPrice, 0);

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Sets y binders</SectionLabel>
        <p className="text-sm font-semibold text-[var(--amber)]">
          ≈{formatMoney(totalMissingCost)} para completarlos todos
          {totalMissingWithoutPrice > 0 && (
            <span className="ml-1 font-normal text-[var(--text-muted)]">
              (+{totalMissingWithoutPrice} sin precio conocido)
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {sorted.map((s) => (
          <div key={s.checklistId} className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-sm">
              <span className="truncate font-semibold text-[var(--text-primary)]">{s.title}</span>
              <span className="shrink-0 tabular-nums text-[var(--text-muted)]">
                {s.ownedCount}/{s.totalCount} ({s.pct}%)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--gridline)]">
              <div className="h-full rounded-full bg-[var(--beacon)] transition-all" style={{ width: `${s.pct}%` }} />
            </div>
            {s.totalCount - s.ownedCount > 0 && (
              <p className="text-xs text-[var(--text-muted)]">
                Te faltan {s.totalCount - s.ownedCount}
                {s.missingCost > 0 && <> · ≈{formatMoney(s.missingCost)} para completarlo</>}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
