import { useState } from "react";
import type { MoveToCollectionDetails, NewWishlistItem, WishlistItem, WishlistPriority } from "../../domain/types";
import { groupWishlistByMonth, monthLabel } from "../../domain/calculations";
import { badgeToneColors, type BadgeTone } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { focusRing, inputClass } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { PhotoField } from "../../components/PhotoField";
import { ScreenHeader } from "../../components/ScreenHeader";
import { MoveToCollectionForm } from "./MoveToCollectionForm";
import { WishlistQuickForm } from "./WishlistQuickForm";

const PRIORITY_LABELS: Record<WishlistPriority, string> = { low: "Baja", medium: "Media", high: "Alta" };

// Prioridad como insignia de color, del mismo modo que la condición de una carta —
// baja = neutra, media = ámbar (atención), alta = roja (urgente, coincide con el rojo
// de marca reservado para acciones/urgencia).
const PRIORITY_TONES: Record<WishlistPriority, BadgeTone> = { low: "neutral", medium: "amber", high: "critical" };

function WishlistItemCard({
  item,
  onUpdate,
  onRemove,
  onMoveToCollection,
}: {
  item: WishlistItem;
  onUpdate: (id: string, entity: NewWishlistItem) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onMoveToCollection: (id: string, details: MoveToCollectionDetails) => Promise<void>;
}) {
  const confirm = useConfirm();
  const [showMoveForm, setShowMoveForm] = useState(false);
  // Precio máximo en estado local: si se llamara a onUpdate (una petición al backend +
  // recarga de toda la wishlist) en cada pulsación, se nota como lag al escribir. Solo
  // se guarda al salir del campo o pulsar Enter — mismo patrón que la edición inline del Plan.
  const [maxPriceInput, setMaxPriceInput] = useState(item.maxPrice !== null ? String(item.maxPrice) : "");

  function strip(item: WishlistItem): NewWishlistItem {
    const { id: _id, ...rest } = item;
    return rest;
  }

  async function handleRemove() {
    if (await confirm(`¿Quitar "${item.name}" de la wishlist?`)) {
      await onRemove(item.id);
    }
  }

  function commitMaxPrice() {
    const value = maxPriceInput.trim() ? Number(maxPriceInput) : null;
    if (value === item.maxPrice) return;
    onUpdate(item.id, { ...strip(item), maxPrice: value });
  }

  const priorityColors = badgeToneColors[PRIORITY_TONES[item.priority]];

  return (
    <Card
      variant="gradient"
      className="flex flex-col gap-3"
      // El tinte de la tarjeta sigue el color de prioridad (no solo la insignia): las
      // tarjetas de prioridad alta se ven más "calientes", las de baja quedan neutras —
      // se escanea la urgencia de un vistazo, sin leer cada insignia una a una.
      style={{
        background: `linear-gradient(165deg, color-mix(in srgb, ${priorityColors.bg} 28%, var(--surface-2)) 0%, var(--surface-1) 62%, var(--page) 145%)`,
      }}
    >
      <PhotoField
        label="Foto"
        photo={item.photo}
        onChange={(photo) => onUpdate(item.id, { ...strip(item), photo })}
        size="lg"
        glow={priorityColors.bg}
      />

      <div>
        <p className="truncate font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">{item.name}</p>
        {item.setName && <p className="truncate text-xs text-[var(--text-muted)]">{item.setName}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* select "disfrazado" de insignia de color: sigue siendo editable (accesible por
            teclado, con las opciones nativas del navegador) pero se ve como el resto de
            metadatos de color sólido de la app. */}
        <select
          aria-label="Prioridad"
          className={`rounded-full border-0 px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${focusRing}`}
          style={{ backgroundColor: priorityColors.bg, color: priorityColors.fg }}
          value={item.priority}
          onChange={(e) => onUpdate(item.id, { ...strip(item), priority: e.target.value as WishlistPriority })}
        >
          {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              Prioridad {label}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          step="0.01"
          placeholder="Precio máx."
          aria-label="Precio máximo"
          className={`${inputClass} w-28 text-xs`}
          value={maxPriceInput}
          onChange={(e) => setMaxPriceInput(e.target.value)}
          onBlur={commitMaxPrice}
          onKeyDown={(e) => e.key === "Enter" && commitMaxPrice()}
        />
        <input
          type="month"
          aria-label="Mes objetivo"
          className={`${inputClass} w-auto text-xs`}
          value={item.targetMonth ?? ""}
          onChange={(e) => onUpdate(item.id, { ...strip(item), targetMonth: e.target.value || null })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button size="sm" tone="beacon" onClick={() => setShowMoveForm(true)}>
          Ya la tengo
        </Button>
        <button
          type="button"
          onClick={handleRemove}
          aria-label={`Quitar ${item.name} de la wishlist`}
          className="ml-auto rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--gridline)] hover:text-[var(--status-critical)]"
        >
          Quitar
        </button>
      </div>

      {showMoveForm && (
        <MoveToCollectionForm
          cardName={item.name}
          onSubmit={async (details) => {
            await onMoveToCollection(item.id, details);
            setShowMoveForm(false);
          }}
          onCancel={() => setShowMoveForm(false)}
        />
      )}
    </Card>
  );
}

export function WishlistScreen({
  items,
  onAdd,
  onUpdate,
  onRemove,
  onMoveToCollection,
}: {
  items: WishlistItem[];
  onAdd: (entity: NewWishlistItem) => Promise<void>;
  onUpdate: (id: string, entity: NewWishlistItem) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onMoveToCollection: (id: string, details: MoveToCollectionDetails) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = query.trim()
    ? items.filter((i) => `${i.name} ${i.setName ?? ""}`.toLowerCase().includes(query.trim().toLowerCase()))
    : items;
  const groups = groupWishlistByMonth(filtered);

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Wishlist" subtitle="Organizada por mes objetivo de compra." />

      <button
        type="button"
        onClick={() => setShowForm(true)}
        aria-label="Añadir deseo a la wishlist"
        className="fixed right-4 bottom-[var(--nav-clearance)] z-20 flex size-14 items-center justify-center rounded-full text-2xl font-bold text-[var(--on-hero)] shadow-float transition-transform hover:scale-105 active:scale-95 sm:right-8 sm:bottom-8"
        style={{ background: "var(--hero-gradient)" }}
      >
        +
      </button>

      {items.length > 0 && (
        <div className="relative max-w-sm">
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--text-muted)]">
            🔍
          </span>
          <input
            className={`${inputClass} rounded-full py-2.5 pl-9`}
            placeholder="Buscar en tu wishlist…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {showForm && (
        <Modal title="Añadir a la wishlist" onClose={() => setShowForm(false)}>
          <WishlistQuickForm
            onSubmit={async (entity) => {
              await onAdd(entity);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </Modal>
      )}

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">✨ Todavía no hay nada en tu wishlist.</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">Sin resultados para esa búsqueda.</p>
        </Card>
      ) : (
        groups.map((group) => (
          <div key={group.month ?? "sin-mes"} className="flex flex-col gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-wide text-[var(--text-secondary)] uppercase">
              {monthLabel(group.month)}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <WishlistItemCard
                  key={item.id}
                  item={item}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onMoveToCollection={onMoveToCollection}
                />
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
