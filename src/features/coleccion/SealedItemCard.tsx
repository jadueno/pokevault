import { useState } from "react";
import type { NewSealedPurchase, SealedPurchase } from "../../domain/types";
import { costPerCard, formatMoney } from "../../domain/calculations";
import { Badge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { inputClass } from "../../components/Field";
import { PhotoField } from "../../components/PhotoField";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  booster_pack: "Sobre",
  booster_box: "Caja de sobres",
  elite_trainer_box: "Elite Trainer Box",
  bundle: "Bundle",
  tin: "Lata",
  other: "Otro",
};

export function SealedItemCard({
  item,
  linkedCardCount,
  onEdit,
  onUpdate,
  onRemove,
  onOverrideValue,
}: {
  item: SealedPurchase;
  /** Cuántas cartas de la colección se han vinculado ya a este sobre concreto. */
  linkedCardCount: number;
  onEdit: (item: SealedPurchase) => void;
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
    <Card variant="gradient" className="flex flex-col gap-3">
      <PhotoField label="Foto" photo={item.photo} onChange={handlePhotoChange} />

      <div>
        <p className="truncate font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">{item.productName}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone="amber">{PRODUCT_TYPE_LABELS[item.productType]}</Badge>
          <span className="text-xs font-semibold text-[var(--text-muted)]">x{item.quantity}</span>
          {item.location && <span className="text-xs text-[var(--text-muted)]">· {item.location}</span>}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">Comprado por</span>
        <span className="font-semibold text-[var(--text-primary)]">
          {item.purchasePrice !== null ? formatMoney(item.purchasePrice, item.purchaseCurrency) : "—"}
        </span>
      </div>

      {linkedCardCount > 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          🎴 {linkedCardCount} carta{linkedCardCount === 1 ? "" : "s"} de la colección vinculada{linkedCardCount === 1 ? "" : "s"} a
          este sobre
          {costPerCard(item, linkedCardCount) !== null && (
            <>
              {" "}
              · <span className="font-semibold text-[var(--amber)]">≈{formatMoney(costPerCard(item, linkedCardCount))}/carta</span>
            </>
          )}
        </p>
      )}

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
            className="font-semibold text-[var(--amber)] hover:underline"
          >
            {item.estimatedValueOverride !== null ? formatMoney(item.estimatedValueOverride) : "Sin estimar"}
          </button>
        )}
      </div>

      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => onEdit(item)}
          aria-label={`Editar ${item.productName}`}
          className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--gridline)] hover:text-[var(--text-primary)]"
        >
          Editar
        </button>
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
