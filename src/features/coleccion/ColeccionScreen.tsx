import { useState } from "react";
import type { CollectionItem, NewSealedPurchase, SealedPurchase } from "../../domain/types";
import { formatMoney } from "../../domain/calculations";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { inputClass, focusRing } from "../../components/Field";
import { PhotoField } from "../../components/PhotoField";
import { PhotoLightbox } from "../../components/PhotoLightbox";
import { SealedPurchaseForm } from "../sellado/SealedPurchaseForm";

const LANGUAGE_LABELS: Record<string, string> = {
  es: "ES",
  en: "EN",
  fr: "FR",
  de: "DE",
  it: "IT",
  pt: "PT",
  ja: "JA",
  ko: "KO",
  "zh-cn": "ZH-CN",
  "zh-tw": "ZH-TW",
  id: "ID",
  th: "TH",
};

const CONDITION_LABELS: Record<string, string> = {
  mint: "Mint",
  near_mint: "Near Mint",
  excellent: "Excellent",
  good: "Good",
  light_played: "Light Played",
  played: "Played",
  poor: "Poor",
};

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  booster_pack: "Sobre",
  booster_box: "Caja de sobres",
  elite_trainer_box: "Elite Trainer Box",
  bundle: "Bundle",
  tin: "Lata",
  other: "Otro",
};

function ItemCard({
  item,
  onRemove,
  onOverrideValue,
}: {
  item: CollectionItem;
  onRemove: (id: string) => Promise<void>;
  onOverrideValue: (id: string, value: number, note: string | null) => Promise<void>;
}) {
  const confirm = useConfirm();
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState(String(item.estimatedValueOverride ?? ""));
  const [busy, setBusy] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  async function handleRemove() {
    if (await confirm(`¿Eliminar este ejemplar de "${item.name}"? Esta acción no se puede deshacer.`)) {
      await onRemove(item.id);
    }
  }

  async function handleSaveValue() {
    const value = Number(valueInput);
    if (!Number.isFinite(value)) return;
    setBusy(true);
    try {
      await onOverrideValue(item.id, value, "Corrección manual");
      setEditingValue(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {item.photo && (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={`Ver foto de ${item.name} en grande`}
            className={`shrink-0 rounded-lg ${focusRing}`}
          >
            <img src={item.photo} alt={item.name} loading="lazy" className="w-16 rounded-lg object-cover" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--text-primary)]">{item.name}</p>
          {item.setName && <p className="truncate text-xs text-[var(--text-muted)]">{item.setName}</p>}
          <p className="text-xs text-[var(--text-muted)]">
            {LANGUAGE_LABELS[item.language]} · {CONDITION_LABELS[item.condition]} · x{item.quantity}
            {item.isGraded && ` · ${item.gradingCompany} ${item.grade}`}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">Comprada por</span>
        <span className="font-semibold text-[var(--text-primary)]">
          {item.purchasePrice !== null ? formatMoney(item.purchasePrice, item.purchaseCurrency) : "Sin precio (salió de un sobre)"}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">Valor estimado</span>
        {editingValue ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.01"
              className={`${inputClass} w-24 text-right`}
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              autoFocus
            />
            <Button size="sm" variant="ghost" disabled={busy} onClick={handleSaveValue}>
              OK
            </Button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditingValue(true)} className="font-semibold text-[var(--beacon)] hover:underline">
            {item.estimatedValueOverride !== null ? formatMoney(item.estimatedValueOverride) : "Sin valor conocido"}
          </button>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleRemove}
          aria-label={`Eliminar ejemplar de ${item.name}`}
          className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--gridline)] hover:text-[var(--status-critical)]"
        >
          Eliminar
        </button>
      </div>

      {lightboxOpen && item.photo && (
        <PhotoLightbox src={item.photo} alt={item.name} onClose={() => setLightboxOpen(false)} />
      )}
    </Card>
  );
}

function SealedItemCard({
  item,
  onUpdate,
  onRemove,
  onOverrideValue,
}: {
  item: SealedPurchase;
  onUpdate: (id: string, entity: NewSealedPurchase) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onOverrideValue: (id: string, value: number, note: string | null) => Promise<void>;
}) {
  const confirm = useConfirm();
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState(String(item.estimatedValueOverride ?? ""));
  const [busy, setBusy] = useState(false);

  async function handleRemove() {
    if (await confirm(`¿Eliminar "${item.productName}"? Esta acción no se puede deshacer.`)) {
      await onRemove(item.id);
    }
  }

  async function handleSaveValue() {
    const value = Number(valueInput);
    if (!Number.isFinite(value)) return;
    setBusy(true);
    try {
      await onOverrideValue(item.id, value, "Estimado a mano");
      setEditingValue(false);
    } finally {
      setBusy(false);
    }
  }

  function handlePhotoChange(photo: string | null) {
    const { id: _id, ...rest } = item;
    onUpdate(item.id, { ...rest, photo });
  }

  return (
    <Card className="flex flex-col gap-3">
      <PhotoField label="Foto" photo={item.photo} onChange={handlePhotoChange} />

      <div>
        <p className="truncate font-semibold text-[var(--text-primary)]">{item.productName}</p>
        <p className="text-xs text-[var(--text-muted)]">
          {PRODUCT_TYPE_LABELS[item.productType]} · x{item.quantity}
          {item.location && ` · ${item.location}`}
        </p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">Comprado por</span>
        <span className="font-semibold text-[var(--text-primary)]">
          {item.purchasePrice !== null ? formatMoney(item.purchasePrice, item.purchaseCurrency) : "—"}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">Valor estimado</span>
        {editingValue ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.01"
              className={`${inputClass} w-24 text-right`}
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              autoFocus
            />
            <Button size="sm" variant="ghost" disabled={busy} onClick={handleSaveValue}>
              OK
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingValue(true)}
            className="font-semibold text-[var(--gold)] hover:underline"
          >
            {item.estimatedValueOverride !== null ? formatMoney(item.estimatedValueOverride) : "Sin estimar"}
          </button>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleRemove}
          aria-label={`Eliminar ${item.productName}`}
          className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--gridline)] hover:text-[var(--status-critical)]"
        >
          Eliminar
        </button>
      </div>
    </Card>
  );
}

export function ColeccionScreen({
  items,
  onRemove,
  onOverrideValue,
  sealedItems,
  onAddSealed,
  onUpdateSealed,
  onRemoveSealed,
  onOverrideSealedValue,
}: {
  items: CollectionItem[];
  onRemove: (id: string) => Promise<void>;
  onOverrideValue: (id: string, value: number, note: string | null) => Promise<void>;
  sealedItems: SealedPurchase[];
  onAddSealed: (entity: NewSealedPurchase) => Promise<void>;
  onUpdateSealed: (id: string, entity: NewSealedPurchase) => Promise<void>;
  onRemoveSealed: (id: string) => Promise<void>;
  onOverrideSealedValue: (id: string, value: number, note: string | null) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [showSealedForm, setShowSealedForm] = useState(false);

  const q = query.trim().toLowerCase();
  const filteredItems = q ? items.filter((i) => `${i.name} ${i.setName ?? ""}`.toLowerCase().includes(q)) : items;
  const filteredSealed = q ? sealedItems.filter((i) => i.productName.toLowerCase().includes(q)) : sealedItems;

  const isEmpty = items.length === 0 && sealedItems.length === 0;
  const noResults = !isEmpty && filteredItems.length === 0 && filteredSealed.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3 py-4 sm:py-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">Mi colección</h1>
          <p className="text-base font-normal text-[var(--text-secondary)]">
            <strong className="font-bold text-[var(--text-primary)]">{items.length}</strong> carta{items.length === 1 ? "" : "s"} y{" "}
            <strong className="font-bold text-[var(--text-primary)]">{sealedItems.length}</strong> de producto sellado.
          </p>
        </div>
        <Button tone="ink" onClick={() => setShowSealedForm(true)}>
          + Añadir compra sellada
        </Button>
      </div>

      {!isEmpty && (
        <input
          className={`${inputClass} max-w-sm`}
          placeholder="Buscar en toda tu colección…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {showSealedForm && (
        <SealedPurchaseForm
          onSubmit={async (entity) => {
            await onAddSealed(entity);
            setShowSealedForm(false);
          }}
          onCancel={() => setShowSealedForm(false)}
        />
      )}

      {isEmpty ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">Todavía no has añadido nada a tu colección. Ve a "Añadir" para empezar.</p>
        </Card>
      ) : noResults ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">Sin resultados para esa búsqueda.</p>
        </Card>
      ) : (
        <>
          {filteredItems.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-bold tracking-wide text-[var(--text-secondary)] uppercase">Cartas</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item) => (
                  <ItemCard key={item.id} item={item} onRemove={onRemove} onOverrideValue={onOverrideValue} />
                ))}
              </div>
            </div>
          )}

          {filteredSealed.length > 0 && (
            <div className="flex flex-col gap-3">
              <h2 className="text-sm font-bold tracking-wide text-[var(--text-secondary)] uppercase">Producto sellado</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredSealed.map((item) => (
                  <SealedItemCard
                    key={item.id}
                    item={item}
                    onUpdate={onUpdateSealed}
                    onRemove={onRemoveSealed}
                    onOverrideValue={onOverrideSealedValue}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
