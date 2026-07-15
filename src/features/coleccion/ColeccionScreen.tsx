import { useState } from "react";
import type { CollectionItemWithCard } from "../../domain/types";
import { formatMoney } from "../../domain/calculations";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { inputClass } from "../../components/Field";

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

function ItemCard({
  item,
  onRemove,
  onOverrideValue,
}: {
  item: CollectionItemWithCard;
  onRemove: (id: string) => Promise<void>;
  onOverrideValue: (id: string, value: number, note: string | null) => Promise<void>;
}) {
  const confirm = useConfirm();
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState(String(item.estimatedValueOverride ?? item.card.currentPrice ?? ""));
  const [busy, setBusy] = useState(false);

  const estimatedValue = item.estimatedValueOverride ?? item.card.currentPrice;

  async function handleRemove() {
    if (await confirm(`¿Eliminar este ejemplar de "${item.card.name}"? Esta acción no se puede deshacer.`)) {
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
        {item.card.imageSmallUrl && (
          <img src={item.card.imageSmallUrl} alt={item.card.name} loading="lazy" className="w-16 shrink-0 rounded-lg" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--text-primary)]">{item.card.name}</p>
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
          <button
            type="button"
            onClick={() => setEditingValue(true)}
            className="font-semibold text-[var(--beacon)] hover:underline"
          >
            {estimatedValue !== null ? formatMoney(estimatedValue, item.card.currentPriceCurrency ?? "EUR") : "Sin valor conocido"}
            {item.estimatedValueOverride !== null && <span className="ml-1 text-xs text-[var(--text-muted)]">(manual)</span>}
          </button>
        )}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleRemove}
          aria-label={`Eliminar ejemplar de ${item.card.name}`}
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
}: {
  items: CollectionItemWithCard[];
  onRemove: (id: string) => Promise<void>;
  onOverrideValue: (id: string, value: number, note: string | null) => Promise<void>;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="py-4 sm:py-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">Mi colección</h1>
        <p className="text-base font-normal text-[var(--text-secondary)]">
          <strong className="font-bold text-[var(--text-primary)]">{items.length}</strong> ejemplar
          {items.length === 1 ? "" : "es"} registrado{items.length === 1 ? "" : "s"}.
        </p>
      </div>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">
            Todavía no has añadido ninguna carta. Ve a "Buscar" para empezar.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} onRemove={onRemove} onOverrideValue={onOverrideValue} />
          ))}
        </div>
      )}
    </div>
  );
}
