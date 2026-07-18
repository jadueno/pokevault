import { useState } from "react";
import type { CollectionItem, SetChecklist, SetChecklistCard } from "../../domain/types";
import { computeSetChecklistCompletion } from "../../domain/calculations";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";

function ChecklistCard({
  checklist,
  cards,
  collectionItems,
  expanded,
  onToggle,
}: {
  checklist: SetChecklist;
  /** `undefined` mientras no se ha pedido cargar las cartas de este checklist todavía. */
  cards: SetChecklistCard[] | undefined;
  collectionItems: CollectionItem[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const completion = cards ? computeSetChecklistCompletion(cards, collectionItems, [checklist.setName, checklist.setNameEs]) : null;
  const ownedCount = completion?.owned.length ?? null;
  const total = checklist.totalCards;
  const pct = ownedCount !== null && total > 0 ? Math.round((ownedCount / total) * 100) : 0;

  return (
    <Card variant="gradient" className="flex flex-col gap-3">
      <div>
        <p className="truncate font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">
          {checklist.setNameEs ?? checklist.setName}
        </p>
        {checklist.setNameEs && <p className="truncate text-xs text-[var(--text-muted)]">{checklist.setName}</p>}
      </div>

      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-muted)]">Completado</span>
          <span className="font-semibold text-[var(--text-primary)]">
            {ownedCount !== null ? `${ownedCount}/${total} (${pct}%)` : `— / ${total}`}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--gridline)]">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: "var(--hero-gradient)" }}
          />
        </div>
      </div>

      <Button variant="tint" size="sm" onClick={onToggle}>
        {expanded ? "Ocultar" : "Ver qué me falta"}
      </Button>

      {expanded &&
        (cards === undefined ? (
          <p className="text-sm text-[var(--text-muted)]">Cargando…</p>
        ) : completion && completion.missing.length === 0 ? (
          <p className="text-sm font-semibold text-[var(--status-good)]">✓ Set completo.</p>
        ) : (
          <ul className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
            {completion?.missing.map((card) => (
              <li key={card.id} className="flex items-center gap-2 text-sm">
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt="" loading="lazy" className="h-10 w-auto shrink-0 rounded border border-[var(--border)]" />
                ) : (
                  <span aria-hidden="true" className="flex h-10 w-8 shrink-0 items-center justify-center rounded text-xs">
                    🎴
                  </span>
                )}
                <span className="shrink-0 tabular-nums text-[var(--text-muted)]">#{card.number}</span>
                <span className="min-w-0 flex-1 truncate text-[var(--text-primary)]">{card.name}</span>
                {card.rarity && (
                  <Badge tone="neutral" className="shrink-0">
                    {card.rarity}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        ))}
    </Card>
  );
}

export function SetChecklistTab({
  checklists,
  cardsByChecklist,
  collectionItems,
  onLoadCards,
}: {
  checklists: SetChecklist[];
  cardsByChecklist: Record<string, SetChecklistCard[]>;
  collectionItems: CollectionItem[];
  onLoadCards: (checklistId: string) => Promise<void>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (checklists.length === 0) {
    return (
      <Card>
        <p className="text-sm text-[var(--text-muted)]">
          📋 Todavía no has sincronizado ningún set. Pide que sincronice uno (p. ej. "sincroniza Oscuridad Absoluta") para ver qué
          cartas te faltan.
        </p>
      </Card>
    );
  }

  async function handleToggle(checklist: SetChecklist) {
    if (expandedId === checklist.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(checklist.id);
    if (!cardsByChecklist[checklist.id]) {
      await onLoadCards(checklist.id);
    }
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {checklists.map((checklist) => (
        <ChecklistCard
          key={checklist.id}
          checklist={checklist}
          cards={cardsByChecklist[checklist.id]}
          collectionItems={collectionItems}
          expanded={expandedId === checklist.id}
          onToggle={() => handleToggle(checklist)}
        />
      ))}
    </div>
  );
}
