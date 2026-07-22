import { useEffect, useRef, useState } from "react";
import type { CollectionItem, NewCollectionItem, SetChecklist, SetChecklistCard, SetSearchCandidate } from "../../domain/types";
import {
  computeSetChecklistCompletion,
  findOwnedCollectionItemIds,
  formatMoney,
  normalizeCardNumber,
} from "../../domain/calculations";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { focusRing, inputClass } from "../../components/Field";
import { PhotoLightbox } from "../../components/PhotoLightbox";

/** Buscar un set nuevo en el proveedor y elegir de la lista de candidatos, en vez de
 * adivinar el set a partir de texto libre — comprobado en vivo: el proveedor solo tiene
 * nombres en inglés, así que buscar en español no encuentra nada. El alias en español se
 * autorrellena con lo que se ha buscado, para que la próxima carta de este set se
 * relacione en local aunque se escriba distinto al nombre oficial. */
function SetSearchPanel({
  checklists,
  onSearch,
  onSync,
}: {
  checklists: SetChecklist[];
  onSearch: (query: string) => Promise<SetSearchCandidate[]>;
  onSync: (externalSetId: string, setNameEs: string | null) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SetSearchCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const syncedIds = new Set(checklists.map((c) => c.externalSetId));

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    try {
      setResults(await onSearch(q));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido buscar");
      setResults(null);
    } finally {
      setSearching(false);
    }
  }

  async function handleSync(candidate: SetSearchCandidate) {
    setSyncingId(candidate.externalSetId);
    try {
      await onSync(candidate.externalSetId, query.trim() || null);
      setResults(null);
      setQuery("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido añadir el set");
    } finally {
      setSyncingId(null);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm font-bold text-[var(--text-primary)]">Buscar un set nuevo</p>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          className={inputClass}
          placeholder="Nombre en inglés, p. ej. Pitch Black"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" variant="tint" disabled={searching} className="shrink-0">
          {searching ? "Buscando…" : "Buscar"}
        </Button>
      </form>
      {error && <p className="text-sm text-[var(--status-critical)]">{error}</p>}
      {results && results.length === 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          Sin resultados. El proveedor solo tiene nombres en inglés — prueba con el nombre en inglés del set.
        </p>
      )}
      {results && results.length > 0 && (
        <ul className="flex flex-col gap-2">
          {results.map((candidate) => {
            const already = syncedIds.has(candidate.externalSetId);
            return (
              <li
                key={candidate.externalSetId}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] p-2.5 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-[var(--text-primary)]">{candidate.name}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {candidate.totalCards} cartas{candidate.releaseDate ? ` · ${candidate.releaseDate}` : ""}
                  </p>
                </div>
                {already ? (
                  <span className="shrink-0 text-xs text-[var(--text-muted)]">Ya lo tienes</span>
                ) : (
                  <Button
                    size="sm"
                    tone="beacon"
                    disabled={syncingId === candidate.externalSetId}
                    onClick={() => handleSync(candidate)}
                    className="shrink-0"
                  >
                    {syncingId === candidate.externalSetId ? "Añadiendo…" : "Añadir este set"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function ChecklistSummaryCard({
  checklist,
  cards,
  collectionItems,
  expanded,
  onToggle,
  onResync,
}: {
  checklist: SetChecklist;
  cards: SetChecklistCard[] | undefined;
  collectionItems: CollectionItem[];
  expanded: boolean;
  onToggle: () => void;
  onResync: (checklistId: string) => Promise<void>;
}) {
  const [resyncing, setResyncing] = useState(false);
  const completion = cards ? computeSetChecklistCompletion(cards, collectionItems, [checklist.setName, checklist.setNameEs]) : null;
  const ownedCount = completion?.owned.length ?? null;
  const total = checklist.totalCards;
  const pct = ownedCount !== null && total > 0 ? Math.round((ownedCount / total) * 100) : 0;

  async function handleResync() {
    setResyncing(true);
    try {
      await onResync(checklist.id);
    } finally {
      setResyncing(false);
    }
  }

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

      <div className="flex gap-2">
        <Button variant="tint" size="sm" onClick={onToggle} className="flex-1">
          {expanded ? "Ocultar" : "Ver el set completo"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResync}
          disabled={resyncing}
          aria-label={`Actualizar ${checklist.setNameEs ?? checklist.setName}`}
          title="Volver a traer las cartas de este set (rellena precio si no lo tenía)"
        >
          {resyncing ? "…" : "🔄"}
        </Button>
      </div>
    </Card>
  );
}

function ChecklistCardThumb({
  card,
  owned,
  onZoom,
  selecting,
  selected,
  onToggleSelect,
}: {
  card: SetChecklistCard;
  owned: boolean;
  onZoom: () => void;
  selecting: boolean;
  selected: boolean;
  onToggleSelect: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const hasImage = !!card.imageUrl && !failed;
  // En modo selección se pueden marcar tanto las que faltan (para darlas de alta) como
  // las que ya tienes (para poder quitarlas de la colección de golpe si te equivocaste).
  const canSelect = selecting;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-full">
        <button
          type="button"
          onClick={canSelect ? onToggleSelect : hasImage ? onZoom : undefined}
          disabled={!canSelect && !hasImage}
          aria-label={canSelect ? (owned ? `Desmarcar ${card.name}` : `Marcar ${card.name} como mía`) : `Ver ${card.name} en grande`}
          aria-pressed={canSelect ? selected : undefined}
          className={`w-full rounded-xl ${focusRing} disabled:cursor-default`}
        >
          {hasImage ? (
            <img
              src={card.imageUrl!}
              alt={card.name}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => setFailed(true)}
              // Blanco y negro (algo más tenue) para las que faltan, a color para las que
              // ya tienes — se distingue de un vistazo sin tener que leer nada.
              className={`w-full rounded-xl border shadow-card transition-all ${
                canSelect ? "cursor-pointer" : "cursor-zoom-in hover:scale-105"
              } ${owned ? "border-[var(--border)]" : "opacity-60 grayscale hover:opacity-100 hover:grayscale-0"} ${
                selected ? "border-2 border-[var(--beacon)]" : ""
              }`}
            />
          ) : (
            <div
              aria-hidden="true"
              className={`flex aspect-[5/7] w-full items-center justify-center rounded-xl border text-3xl text-[var(--text-muted)] ${
                selected ? "border-2 border-[var(--beacon)]" : "border-dashed border-[var(--border)]"
              } ${owned ? "" : "opacity-60"}`}
            >
              🎴
            </div>
          )}
        </button>
        {canSelect && (
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute top-1.5 left-1.5 flex size-5 items-center justify-center rounded-full border-2 text-xs font-bold ${
              selected ? "border-[var(--beacon)] bg-[var(--beacon)] text-[var(--on-beacon)]" : "border-white bg-black/40"
            }`}
          >
            {selected ? "✓" : ""}
          </span>
        )}
      </div>
      <p className="w-full truncate text-center text-xs font-semibold text-[var(--text-primary)]">{card.name}</p>
      <span className="text-xs tabular-nums text-[var(--text-muted)]">#{card.number}</span>
      {card.referencePrice !== null && (
        <span className="text-xs font-semibold text-[var(--amber)]">≈{formatMoney(card.referencePrice)}</span>
      )}
    </div>
  );
}

type SetCardsFilter = "all" | "owned" | "missing";

const FILTERS: { id: SetCardsFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "owned", label: "Que tengo" },
  { id: "missing", label: "Que me faltan" },
];

/** Todo el set (tuyas y las que faltan), a ancho completo — no metido dentro de la
 * tarjeta estrecha del set, para que las imágenes puedan ser grandes de verdad. */
function SetCardsGrid({
  checklist,
  cards,
  collectionItems,
  onZoom,
  onMarkOwned,
  onRemoveItems,
}: {
  checklist: SetChecklist;
  cards: SetChecklistCard[] | undefined;
  collectionItems: CollectionItem[];
  onZoom: (card: SetChecklistCard) => void;
  onMarkOwned: (entities: NewCollectionItem[]) => Promise<void>;
  onRemoveItems: (ids: string[]) => Promise<void>;
}) {
  const confirm = useConfirm();
  const [filter, setFilter] = useState<SetCardsFilter>("all");
  const [query, setQuery] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [marking, setMarking] = useState(false);
  const [removing, setRemoving] = useState(false);

  const completion = cards ? computeSetChecklistCompletion(cards, collectionItems, [checklist.setName, checklist.setNameEs]) : null;
  const ownedIds = new Set(completion?.owned.map((c) => c.id) ?? []);

  const q = query.trim().toLowerCase();
  const visibleCards = (cards ?? []).filter((card) => {
    if (filter === "owned" && !ownedIds.has(card.id)) return false;
    if (filter === "missing" && ownedIds.has(card.id)) return false;
    if (q && !card.name.toLowerCase().includes(q) && !card.number.toLowerCase().includes(q)) return false;
    return true;
  });

  const selectedMissing = (cards ?? []).filter((c) => selectedIds.has(c.id) && !ownedIds.has(c.id));
  const selectedOwned = (cards ?? []).filter((c) => selectedIds.has(c.id) && ownedIds.has(c.id));

  function toggleSelected(cardId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  }

  function deselect(cardIds: string[]) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of cardIds) next.delete(id);
      return next;
    });
  }

  async function handleMarkOwned() {
    if (selectedMissing.length === 0) return;
    setMarking(true);
    try {
      const now = new Date().toISOString();
      await onMarkOwned(
        selectedMissing.map((card) => ({
          name: card.name,
          setName: checklist.setNameEs ?? checklist.setName,
          number: `${normalizeCardNumber(card.number)}/${checklist.totalCards}`,
          rarity: card.rarity,
          language: "es",
          condition: "near_mint",
          quantity: 1,
          acquisitionType: "purchased_single",
          sealedPurchaseId: null,
          purchasePrice: null,
          purchaseCurrency: "EUR",
          purchaseDate: null,
          isGraded: false,
          gradingCompany: null,
          grade: null,
          estimatedValueOverride: card.referencePrice,
          estimatedValueOverrideAt: card.referencePrice !== null ? now : null,
          estimatedValueOverrideNote: card.referencePrice !== null ? "Precio de referencia de Cardmarket (set sincronizado)" : null,
          notes: null,
          photo: card.imageUrlLarge ?? card.imageUrl,
        })),
      );
      deselect(selectedMissing.map((c) => c.id));
    } finally {
      setMarking(false);
    }
  }

  async function handleRemoveOwned() {
    if (selectedOwned.length === 0) return;
    const ids = findOwnedCollectionItemIds(
      selectedOwned.map((c) => c.number),
      collectionItems,
      [checklist.setName, checklist.setNameEs],
    );
    if (ids.length === 0) return;
    const confirmed = await confirm(
      `¿Quitar ${ids.length} ejemplar${ids.length === 1 ? "" : "es"} de tu colección? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    setRemoving(true);
    try {
      await onRemoveItems(ids);
      deselect(selectedOwned.map((c) => c.id));
    } finally {
      setRemoving(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">
          {checklist.setNameEs ?? checklist.setName}
          {completion && (
            <span className="ml-2 text-sm font-normal text-[var(--text-muted)]">
              {completion.owned.length}/{cards?.length ?? checklist.totalCards} tuyas
            </span>
          )}
        </p>
        <Button
          variant={selecting ? "solid" : "tint"}
          tone={selecting ? "critical" : "ink"}
          size="sm"
          onClick={() => {
            setSelecting(!selecting);
            setSelectedIds(new Set());
          }}
        >
          {selecting ? "Cancelar selección" : "Seleccionar varias"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-full border border-[var(--border)] bg-[var(--surface-1)] p-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap transition-colors ${
                filter === f.id ? "text-[var(--beacon)]" : "text-[var(--text-secondary)] hover:bg-[var(--gridline)]"
              }`}
              style={filter === f.id ? { backgroundColor: "color-mix(in srgb, var(--beacon) 14%, transparent)" } : undefined}
            >
              {f.label}
            </button>
          ))}
        </div>
        <input
          className={`${inputClass} max-w-56 py-1.5 text-sm`}
          placeholder="Buscar por número o nombre…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {cards === undefined ? (
        <p className="text-sm text-[var(--text-muted)]">Cargando…</p>
      ) : visibleCards.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">Sin resultados para ese filtro/búsqueda.</p>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {visibleCards.map((card) => (
            <ChecklistCardThumb
              key={card.id}
              card={card}
              owned={ownedIds.has(card.id)}
              onZoom={() => onZoom(card)}
              selecting={selecting}
              selected={selectedIds.has(card.id)}
              onToggleSelect={() => toggleSelected(card.id)}
            />
          ))}
        </div>
      )}

      {selecting && selectedIds.size > 0 && (
        // --nav-clearance en móvil: deja hueco para el menú inferior fijo, igual que el
        // FAB de "Añadir carta suelta" — en escritorio no hay ese menú, así que basta con
        // bottom-4. z-20 para quedar por encima.
        <div className="sticky bottom-[var(--nav-clearance)] z-20 flex flex-wrap justify-center gap-2 sm:bottom-4">
          {selectedMissing.length > 0 && (
            <Button tone="beacon" disabled={marking} onClick={handleMarkOwned} className="shadow-float">
              {marking ? "Guardando…" : `Marcar ${selectedMissing.length} como mías`}
            </Button>
          )}
          {selectedOwned.length > 0 && (
            <Button tone="critical" disabled={removing} onClick={handleRemoveOwned} className="shadow-float">
              {removing ? "Quitando…" : `Quitar ${selectedOwned.length} de mi colección`}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

export function SetChecklistTab({
  checklists,
  cardsByChecklist,
  collectionItems,
  onSearchSets,
  onSyncSet,
  onResyncSet,
  onMarkOwned,
  onRemoveItems,
}: {
  checklists: SetChecklist[];
  cardsByChecklist: Record<string, SetChecklistCard[]>;
  collectionItems: CollectionItem[];
  onSearchSets: (query: string) => Promise<SetSearchCandidate[]>;
  onSyncSet: (externalSetId: string, setNameEs: string | null) => Promise<void>;
  onResyncSet: (checklistId: string) => Promise<void>;
  onMarkOwned: (entities: NewCollectionItem[]) => Promise<void>;
  onRemoveItems: (ids: string[]) => Promise<void>;
}) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  // Qué checklists ya han recibido su estado inicial (abierto si estaba incompleto), para
  // no volver a abrirlos solos si el usuario los cierra a mano más tarde. Se aplica en un
  // efecto (no en el useState inicial) porque las cartas de cada checklist llegan de forma
  // asíncrona (`useSetChecklistData` las precarga aparte) — sin esto, un set podía quedar
  // sin marcar como "ya visto" si sus cartas no habían llegado todavía en el primer render.
  const initializedIds = useRef<Set<string>>(new Set());
  useEffect(() => {
    setExpandedIds((prev) => {
      let changed = false;
      const next = new Set(prev);
      for (const checklist of checklists) {
        if (initializedIds.current.has(checklist.id)) continue;
        const cards = cardsByChecklist[checklist.id];
        if (!cards) continue;
        initializedIds.current.add(checklist.id);
        const { missing } = computeSetChecklistCompletion(cards, collectionItems, [checklist.setName, checklist.setNameEs]);
        if (missing.length > 0) {
          next.add(checklist.id);
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [checklists, cardsByChecklist, collectionItems]);

  // Vive aquí (no dentro de SetCardsGrid) y el <PhotoLightbox> se renderiza fuera de
  // cualquier <Card> a propósito: `Card` (variant "flat", la que envuelve la rejilla) usa
  // `backdrop-blur`, y un `backdrop-filter` en un ancestro crea un "containing block"
  // nuevo para `position: fixed` — el visor a pantalla completa quedaba encerrado dentro
  // de esa tarjeta en vez de cubrir toda la ventana. Mismo patrón que ya usan los demás
  // visores de la app (siempre como hermano de la tarjeta, nunca dentro).
  const [zoomedCard, setZoomedCard] = useState<SetChecklistCard | null>(null);

  function toggleExpanded(checklistId: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(checklistId)) next.delete(checklistId);
      else next.add(checklistId);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <SetSearchPanel checklists={checklists} onSearch={onSearchSets} onSync={onSyncSet} />

      {checklists.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">
            📋 Todavía no has sincronizado ningún set. Búscalo arriba y añádelo para ver qué cartas tiene y marcar las que ya son
            tuyas.
          </p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {checklists.map((checklist) => (
              <ChecklistSummaryCard
                key={checklist.id}
                checklist={checklist}
                cards={cardsByChecklist[checklist.id]}
                collectionItems={collectionItems}
                expanded={expandedIds.has(checklist.id)}
                onToggle={() => toggleExpanded(checklist.id)}
                onResync={onResyncSet}
              />
            ))}
          </div>

          {checklists
            .filter((checklist) => expandedIds.has(checklist.id))
            .map((checklist) => (
              <SetCardsGrid
                key={checklist.id}
                checklist={checklist}
                cards={cardsByChecklist[checklist.id]}
                collectionItems={collectionItems}
                onZoom={setZoomedCard}
                onMarkOwned={onMarkOwned}
                onRemoveItems={onRemoveItems}
              />
            ))}
        </>
      )}

      {zoomedCard && (
        <PhotoLightbox
          src={zoomedCard.imageUrlLarge ?? zoomedCard.imageUrl ?? ""}
          alt={zoomedCard.name}
          onClose={() => setZoomedCard(null)}
        />
      )}
    </div>
  );
}
