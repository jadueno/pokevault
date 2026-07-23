import { useEffect, useRef, useState } from "react";
import type { CardVariant, CollectionItem, NewCollectionItem, SetChecklist, SetChecklistCard, SetSearchCandidate } from "../../domain/types";
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
import { RefreshIcon } from "../../components/icons";
import { IconButton } from "../../components/IconButton";
import { PhotoLightbox } from "../../components/PhotoLightbox";

/** Buscar un set nuevo en el proveedor y elegir de la lista de candidatos, en vez de
 * adivinar el set a partir de texto libre — comprobado en vivo: el proveedor solo tiene
 * nombres en inglés, así que buscar en español no encuentra nada. El alias en español se
 * autorrellena con lo que se ha buscado, para que la próxima carta de este set se
 * relacione en local aunque se escriba distinto al nombre oficial.
 *
 * Sin tarjeta ni título propios: vive siempre dentro de un <Modal> (ver ColeccionScreen),
 * que ya pone su propio título/descripción — así este panel es solo el formulario y los
 * resultados, sin duplicar la cabecera. */
export function SetSearchPanel({
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
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSearch} className="flex flex-col gap-2">
        <input
          autoFocus
          className={inputClass}
          placeholder="Nombre en inglés, p. ej. Pitch Black"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" variant="tint" disabled={searching} className="w-full">
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
    </div>
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
          aria-label={(() => {
            const displayName = card.variant !== "normal" ? `${card.name} (${VARIANT_LABELS[card.variant]})` : card.name;
            return canSelect ? `${owned ? "Desmarcar" : "Marcar"} ${displayName}${owned ? "" : " como mía"}` : `Ver ${displayName} en grande`;
          })()}
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
      {card.variant !== "normal" && (
        <span className="text-[10px] font-bold tracking-wide text-[var(--amber)] uppercase">
          ✨ {VARIANT_LABELS[card.variant]}
        </span>
      )}
      <span className="text-xs tabular-nums text-[var(--text-muted)]">#{card.number}</span>
      {card.referencePrice !== null && (
        <span className="text-xs font-semibold text-[var(--amber)]">≈{formatMoney(card.referencePrice)}</span>
      )}
    </div>
  );
}

const VARIANT_LABELS: Record<Exclude<CardVariant, "normal">, string> = { reverse: "Reverso", holo: "Holo" };

type SetCardsFilter = "all" | "owned" | "missing";

const FILTERS: { id: SetCardsFilter; label: string }[] = [
  { id: "all", label: "Todas" },
  { id: "owned", label: "Que tengo" },
  { id: "missing", label: "Que me faltan" },
];

/** Todo el set (tuyas y las que faltan). Vive dentro de un panel claro anidado en la
 * propia tarjeta del set (ver SetCard) — no es una tarjeta aparte en otro punto de la
 * página — para que las imágenes puedan ser grandes de verdad sobre un fondo legible,
 * en vez de sobre el degradado oscuro de la tarjeta que la contiene. */
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

  function selectAllVisible() {
    setSelectedIds(new Set(visibleCards.map((c) => c.id)));
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
          variant: card.variant,
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
      selectedOwned.map((c) => ({ number: c.number, variant: c.variant })),
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
    <div className="-mx-5 -mb-5 flex flex-col gap-3 rounded-b-[1.75rem] bg-[var(--surface-1)] p-5 sm:-mx-6 sm:-mb-6 sm:p-6">
      {/* Filtros y selección en la misma fila (ocupando los dos extremos con
       * justify-between) en vez de en dos filas separadas — así ninguna de las dos queda
       * como un único control flotando con un hueco vacío al lado. Si no caben en una
       * línea, el propio flex-wrap manda "Seleccionar varias" a su línea, pegado al
       * borde izquierdo (justify-between con un solo elemento no lo separa del inicio). */}
      <div className="flex flex-wrap items-center justify-between gap-2">
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
        <div className="flex gap-2">
          {/* Siempre visible, no solo tras entrar en modo selección: si todavía no se
           * estaba seleccionando, activa el modo y selecciona todo de golpe en el mismo
           * clic, en vez de obligar a un primer clic en "Seleccionar varias" que por sí
           * solo no serviría de nada. */}
          <Button
            variant="tint"
            tone="ink"
            size="sm"
            onClick={() => {
              setSelecting(true);
              selectAllVisible();
            }}
          >
            Seleccionar todas
          </Button>
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
      </div>

      <input
        className={`${inputClass} w-full py-1.5 text-sm`}
        placeholder="Buscar por número o nombre…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

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
    </div>
  );
}

/** Tarjeta de un set sincronizado: identidad + progreso siempre visibles con el mismo
 * tratamiento "sticker" que la cifra protagonista del Resumen (fondo --hero-gradient), y
 * al pulsar "Ver el set completo" el propio checklist de cartas se abre dentro de esta
 * misma tarjeta (panel claro anidado, ver SetCardsGrid) en vez de aparecer en otra caja
 * en otro punto de la página. */
function SetCard({
  checklist,
  cards,
  collectionItems,
  expanded,
  onToggle,
  onResync,
  onZoom,
  onMarkOwned,
  onRemoveItems,
}: {
  checklist: SetChecklist;
  cards: SetChecklistCard[] | undefined;
  collectionItems: CollectionItem[];
  expanded: boolean;
  onToggle: () => void;
  onResync: (checklistId: string) => Promise<void>;
  onZoom: (card: SetChecklistCard) => void;
  onMarkOwned: (entities: NewCollectionItem[]) => Promise<void>;
  onRemoveItems: (ids: string[]) => Promise<void>;
}) {
  const [resyncing, setResyncing] = useState(false);
  const completion = cards ? computeSetChecklistCompletion(cards, collectionItems, [checklist.setName, checklist.setNameEs]) : null;
  const ownedCount = completion?.owned.length ?? null;
  // cards.length, no checklist.totalCards: este último cuenta cartas del set (120), no
  // filas del checklist — con variantes (normal+reverso), una carta con las dos aporta
  // dos filas que se pueden marcar como tuyas por separado, así que el total real a
  // completar es mayor que 120 en cuanto el set tiene alguna carta con más de una
  // variante. Usar totalCards aquí daba porcentajes por encima de 100%.
  const total = cards?.length ?? checklist.totalCards;
  const pct = ownedCount !== null && total > 0 ? Math.round((ownedCount / total) * 100) : 0;
  const syncedLabel = new Date(checklist.syncedAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

  async function handleResync() {
    setResyncing(true);
    try {
      await onResync(checklist.id);
    } finally {
      setResyncing(false);
    }
  }

  return (
    <Card
      variant="gradient"
      className={`flex flex-col gap-4 ${expanded ? "sm:col-span-2 lg:col-span-3" : ""}`}
      style={{ background: "var(--hero-gradient)" }}
    >
      <div>
        <p className="truncate font-[family-name:var(--font-display)] font-bold text-[var(--on-hero)]">
          {checklist.setNameEs ?? checklist.setName}
        </p>
        <p className="truncate text-xs text-white/70">Sincronizado el {syncedLabel}</p>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/70">Completado</span>
          <span className="font-semibold text-[var(--on-hero)]">
            {ownedCount !== null ? `${ownedCount}/${total} (${pct}%)` : `— / ${total}`}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/25">
          <div className="h-full rounded-full bg-white transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="tint" tone="ink" size="sm" onClick={onToggle} className="flex-1">
          {expanded ? "Ocultar" : "Ver el set completo"}
        </Button>
        <IconButton
          onDark
          onClick={handleResync}
          disabled={resyncing}
          label={`Actualizar ${checklist.setNameEs ?? checklist.setName}`}
          title="Volver a traer las cartas de este set (rellena precio si no lo tenía)"
        >
          <RefreshIcon className={`size-4 ${resyncing ? "animate-spin" : ""}`} />
        </IconButton>
      </div>

      {expanded && (
        <SetCardsGrid
          checklist={checklist}
          cards={cards}
          collectionItems={collectionItems}
          onZoom={onZoom}
          onMarkOwned={onMarkOwned}
          onRemoveItems={onRemoveItems}
        />
      )}
    </Card>
  );
}

export function SetChecklistTab({
  checklists,
  cardsByChecklist,
  collectionItems,
  onResyncSet,
  onMarkOwned,
  onRemoveItems,
}: {
  checklists: SetChecklist[];
  cardsByChecklist: Record<string, SetChecklistCard[]>;
  collectionItems: CollectionItem[];
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
      {checklists.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">
            📋 Todavía no has sincronizado ningún set. Usa el botón "+ Buscar set" para añadir el primero y ver qué cartas tiene.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {checklists.map((checklist) => (
            <SetCard
              key={checklist.id}
              checklist={checklist}
              cards={cardsByChecklist[checklist.id]}
              collectionItems={collectionItems}
              expanded={expandedIds.has(checklist.id)}
              onToggle={() => toggleExpanded(checklist.id)}
              onResync={onResyncSet}
              onZoom={setZoomedCard}
              onMarkOwned={onMarkOwned}
              onRemoveItems={onRemoveItems}
            />
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
    </div>
  );
}
