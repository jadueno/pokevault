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
        {expanded ? "Ocultar" : "Ver el set completo"}
      </Button>
    </Card>
  );
}

function ChecklistCardThumb({ card, owned, onZoom }: { card: SetChecklistCard; owned: boolean; onZoom: () => void }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="flex flex-col items-center gap-1.5">
      {card.imageUrl && !failed ? (
        <button
          type="button"
          onClick={onZoom}
          aria-label={`Ver ${card.name} en grande`}
          className={`w-full rounded-xl ${focusRing}`}
        >
          <img
            src={card.imageUrl}
            alt={card.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            // La tenga o no: siempre se ve la carta entera. Blanco y negro + algo más
            // tenue para las que faltan, borde de color + un poco más grande para las
            // que ya tienes — así se distingue de un vistazo sin tener que leer nada.
            className={`w-full cursor-zoom-in rounded-xl border-2 shadow-card transition-all hover:scale-105 ${
              owned
                ? "border-[var(--status-good)]"
                : "border-[var(--border)] opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
            }`}
          />
        </button>
      ) : (
        <div
          aria-hidden="true"
          className={`flex aspect-[5/7] w-full items-center justify-center rounded-xl border-2 text-3xl ${
            owned ? "border-[var(--status-good)] text-[var(--text-muted)]" : "border-dashed border-[var(--border)] text-[var(--text-muted)] opacity-60"
          }`}
        >
          🎴
        </div>
      )}
      <p className="w-full truncate text-center text-xs font-semibold text-[var(--text-primary)]">{card.name}</p>
      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
        <span className="tabular-nums">#{card.number}</span>
        {owned && (
          <Badge tone="good" className="shrink-0">
            Tuya
          </Badge>
        )}
        {card.rarity && (
          <Badge tone="neutral" className="shrink-0">
            {card.rarity}
          </Badge>
        )}
      </div>
    </div>
  );
}

/** Todo el set (tuyas y las que faltan), a ancho completo — no metido dentro de la
 * tarjeta estrecha del set, para que las imágenes puedan ser grandes de verdad. */
function SetCardsGrid({
  checklist,
  cards,
  collectionItems,
}: {
  checklist: SetChecklist;
  cards: SetChecklistCard[] | undefined;
  collectionItems: CollectionItem[];
}) {
  const [zoomedCard, setZoomedCard] = useState<SetChecklistCard | null>(null);
  const completion = cards ? computeSetChecklistCompletion(cards, collectionItems, [checklist.setName, checklist.setNameEs]) : null;
  const ownedIds = new Set(completion?.owned.map((c) => c.id) ?? []);

  return (
    <Card className="flex flex-col gap-4">
      <p className="font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">
        {checklist.setNameEs ?? checklist.setName}
        {completion && (
          <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
            {completion.owned.length}/{cards?.length ?? checklist.totalCards} tuyas
          </span>
        )}
      </p>

      {cards === undefined ? (
        <p className="text-sm text-[var(--text-muted)]">Cargando…</p>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {cards.map((card) => (
            <ChecklistCardThumb key={card.id} card={card} owned={ownedIds.has(card.id)} onZoom={() => setZoomedCard(card)} />
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
}: {
  checklists: SetChecklist[];
  cardsByChecklist: Record<string, SetChecklistCard[]>;
  collectionItems: CollectionItem[];
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
            onToggle={() => setExpandedId(expandedId === checklist.id ? null : checklist.id)}
          />
        ))}
      </div>

      {expandedChecklist && (
        <SetCardsGrid checklist={expandedChecklist} cards={cardsByChecklist[expandedChecklist.id]} collectionItems={collectionItems} />
      )}
    </div>
  );
}
