import { useState } from "react";
import type { CollectionItem, SetChecklist, SetChecklistCard } from "../../domain/types";
import { computeSetChecklistCompletion } from "../../domain/calculations";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { focusRing } from "../../components/Field";
import { PhotoLightbox } from "../../components/PhotoLightbox";

function ChecklistSummaryCard({
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
    </Card>
  );
}

/** Cartas que faltan de un set, a ancho completo (no metido dentro de la tarjeta estrecha
 * del set — así las imágenes pueden ser grandes de verdad, no miniaturas de lista). */
function MissingCardsGrid({
  checklist,
  cards,
  collectionItems,
}: {
  checklist: SetChecklist;
  cards: SetChecklistCard[] | undefined;
  collectionItems: CollectionItem[];
}) {
  const completion = cards ? computeSetChecklistCompletion(cards, collectionItems, [checklist.setName, checklist.setNameEs]) : null;
  const [zoomedCard, setZoomedCard] = useState<SetChecklistCard | null>(null);

  return (
    <Card className="flex flex-col gap-4">
      <p className="font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">
        Te falta de {checklist.setNameEs ?? checklist.setName}
      </p>

      {cards === undefined ? (
        <p className="text-sm text-[var(--text-muted)]">Cargando…</p>
      ) : completion && completion.missing.length === 0 ? (
        <p className="text-sm font-semibold text-[var(--status-good)]">✓ Set completo.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {completion?.missing.map((card) => (
            <div key={card.id} className="flex flex-col items-center gap-1.5">
              {card.imageUrl ? (
                <button
                  type="button"
                  onClick={() => setZoomedCard(card)}
                  aria-label={`Ver ${card.name} en grande`}
                  className={`w-full rounded-xl ${focusRing}`}
                >
                  <img
                    src={card.imageUrl}
                    alt={card.name}
                    loading="lazy"
                    className="w-full cursor-zoom-in rounded-xl border border-[var(--border)] shadow-card transition-transform hover:scale-105"
                  />
                </button>
              ) : (
                <div
                  aria-hidden="true"
                  className="flex aspect-[5/7] w-full items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-3xl text-[var(--text-muted)]"
                >
                  🎴
                </div>
              )}
              <p className="w-full truncate text-center text-xs font-semibold text-[var(--text-primary)]">{card.name}</p>
              <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                <span className="tabular-nums">#{card.number}</span>
                {card.rarity && <Badge tone="neutral">{card.rarity}</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      {zoomedCard && (
        <PhotoLightbox
          src={zoomedCard.imageUrlLarge ?? zoomedCard.imageUrl ?? ""}
          alt={zoomedCard.name}
          onClose={() => setZoomedCard(null)}
        />
      )}
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

  const expandedChecklist = checklists.find((c) => c.id === expandedId);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {checklists.map((checklist) => (
          <ChecklistSummaryCard
            key={checklist.id}
            checklist={checklist}
            cards={cardsByChecklist[checklist.id]}
            collectionItems={collectionItems}
            expanded={expandedId === checklist.id}
            onToggle={() => handleToggle(checklist)}
          />
        ))}
      </div>

      {expandedChecklist && (
        <MissingCardsGrid
          checklist={expandedChecklist}
          cards={cardsByChecklist[expandedChecklist.id]}
          collectionItems={collectionItems}
        />
      )}
    </div>
  );
}
