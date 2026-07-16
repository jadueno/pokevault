import { useState } from "react";
import type { MoveToCollectionDetails, NewWishlistItem, WishlistItem, WishlistPriority } from "../../domain/types";
import { groupWishlistByMonth, monthLabel } from "../../domain/calculations";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { inputClass } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { PhotoField } from "../../components/PhotoField";
import { MoveToCollectionForm } from "./MoveToCollectionForm";
import { WishlistQuickForm } from "../anadir/WishlistQuickForm";

const PRIORITY_LABELS: Record<WishlistPriority, string> = { low: "Baja", medium: "Media", high: "Alta" };

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

  return (
    <Card className="flex flex-col gap-3">
      <PhotoField
        label="Foto"
        photo={item.photo}
        onChange={(photo) => onUpdate(item.id, { ...strip(item), photo })}
      />

      <div>
        <p className="truncate font-semibold text-[var(--text-primary)]">{item.name}</p>
        {item.setName && <p className="truncate text-xs text-[var(--text-muted)]">{item.setName}</p>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className={`${inputClass} w-auto text-xs`}
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
          className={`${inputClass} w-28 text-xs`}
          value={maxPriceInput}
          onChange={(e) => setMaxPriceInput(e.target.value)}
          onBlur={commitMaxPrice}
          onKeyDown={(e) => e.key === "Enter" && commitMaxPrice()}
        />
        <input
          type="month"
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
      <div className="flex flex-wrap items-start justify-between gap-3 py-4 sm:py-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">Wishlist</h1>
          <p className="text-base font-normal text-[var(--text-secondary)]">Organizada por mes objetivo de compra.</p>
        </div>
        <Button tone="ink" onClick={() => setShowForm(true)}>
          + Añadir deseo
        </Button>
      </div>

      {items.length > 0 && (
        <input
          className={`${inputClass} max-w-sm`}
          placeholder="Buscar en tu wishlist…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {showForm && (
        <Modal title="Añadir a la wishlist" onClose={() => setShowForm(false)}>
          <WishlistQuickForm
            recognized={null}
            photo={null}
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
          <p className="text-sm text-[var(--text-muted)]">Todavía no hay nada en tu wishlist.</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">Sin resultados para esa búsqueda.</p>
        </Card>
      ) : (
        groups.map((group) => (
          <div key={group.month ?? "sin-mes"} className="flex flex-col gap-3">
            <h2 className="text-sm font-bold tracking-wide text-[var(--text-secondary)] uppercase">
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
