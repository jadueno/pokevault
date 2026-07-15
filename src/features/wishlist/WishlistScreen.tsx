import { useState } from "react";
import type { MoveToCollectionDetails, NewWishlistItem, WishlistItemWithCard, WishlistPriority } from "../../domain/types";
import { formatMoney, groupWishlistByMonth, monthLabel } from "../../domain/calculations";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { inputClass } from "../../components/Field";
import { MoveToCollectionForm } from "./MoveToCollectionForm";

const PRIORITY_LABELS: Record<WishlistPriority, string> = { low: "Baja", medium: "Media", high: "Alta" };

function WishlistItemCard({
  item,
  onUpdate,
  onRemove,
  onMoveToCollection,
}: {
  item: WishlistItemWithCard;
  onUpdate: (id: string, entity: NewWishlistItem) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onMoveToCollection: (id: string, details: MoveToCollectionDetails) => Promise<void>;
}) {
  const confirm = useConfirm();
  const [showMoveForm, setShowMoveForm] = useState(false);

  function stripCard(item: WishlistItemWithCard): NewWishlistItem {
    const { id: _id, card: _card, ...rest } = item;
    return rest;
  }

  async function handleRemove() {
    if (await confirm(`¿Quitar "${item.card.name}" de la wishlist?`)) {
      await onRemove(item.id);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {item.card.imageSmallUrl && (
          <img src={item.card.imageSmallUrl} alt={item.card.name} loading="lazy" className="w-16 shrink-0 rounded-lg" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--text-primary)]">{item.card.name}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {formatMoney(item.card.currentPrice, item.card.currentPriceCurrency ?? "EUR")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          className={`${inputClass} w-auto text-xs`}
          value={item.priority}
          onChange={(e) => onUpdate(item.id, { ...stripCard(item), priority: e.target.value as WishlistPriority })}
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
          value={item.maxPrice ?? ""}
          onChange={(e) => onUpdate(item.id, { ...stripCard(item), maxPrice: e.target.value ? Number(e.target.value) : null })}
        />
        <input
          type="month"
          className={`${inputClass} w-auto text-xs`}
          value={item.targetMonth ?? ""}
          onChange={(e) => onUpdate(item.id, { ...stripCard(item), targetMonth: e.target.value || null })}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button size="sm" tone="beacon" onClick={() => setShowMoveForm(true)}>
          Ya la tengo
        </Button>
        <button
          type="button"
          onClick={handleRemove}
          aria-label={`Quitar ${item.card.name} de la wishlist`}
          className="ml-auto rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--gridline)] hover:text-[var(--status-critical)]"
        >
          Quitar
        </button>
      </div>

      {showMoveForm && (
        <MoveToCollectionForm
          cardName={item.card.name}
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
  onUpdate,
  onRemove,
  onMoveToCollection,
}: {
  items: WishlistItemWithCard[];
  onUpdate: (id: string, entity: NewWishlistItem) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onMoveToCollection: (id: string, details: MoveToCollectionDetails) => Promise<void>;
}) {
  const groups = groupWishlistByMonth(items);

  return (
    <div className="flex flex-col gap-6">
      <div className="py-4 sm:py-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">Wishlist</h1>
        <p className="text-base font-normal text-[var(--text-secondary)]">
          Organizada por mes objetivo de compra. Añade cartas desde "Buscar".
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">
            Todavía no hay nada en tu wishlist. Ve a "Buscar" y añade lo que quieras conseguir.
          </p>
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
