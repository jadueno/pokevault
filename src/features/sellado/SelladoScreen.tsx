import { useState } from "react";
import type { NewSealedPurchase, SealedPurchase } from "../../domain/types";
import { formatMoney } from "../../domain/calculations";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { inputClass } from "../../components/Field";
import { SealedPurchaseForm } from "./SealedPurchaseForm";

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  booster_pack: "Sobre",
  booster_box: "Caja de sobres",
  elite_trainer_box: "Elite Trainer Box",
  bundle: "Bundle",
  tin: "Lata",
  other: "Otro",
};

function SealedItemCard({
  item,
  onRemove,
  onOverrideValue,
}: {
  item: SealedPurchase;
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

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {item.photo && <img src={item.photo} alt={item.productName} loading="lazy" className="w-16 shrink-0 rounded-lg object-cover" />}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-[var(--text-primary)]">{item.productName}</p>
          <p className="text-xs text-[var(--text-muted)]">
            {PRODUCT_TYPE_LABELS[item.productType]} · x{item.quantity}
            {item.location && ` · ${item.location}`}
          </p>
        </div>
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

export function SelladoScreen({
  items,
  onAdd,
  onRemove,
  onOverrideValue,
}: {
  items: SealedPurchase[];
  onAdd: (entity: NewSealedPurchase) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onOverrideValue: (id: string, value: number, note: string | null) => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [query, setQuery] = useState("");
  const filtered = query.trim() ? items.filter((i) => i.productName.toLowerCase().includes(query.trim().toLowerCase())) : items;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3 py-4 sm:py-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">
            Producto sellado
          </h1>
          <p className="text-base font-normal text-[var(--text-secondary)]">
            Sobres, cajas y demás producto sin abrir.
          </p>
        </div>
        <Button tone="ink" onClick={() => setShowForm(true)}>
          + Añadir compra
        </Button>
      </div>

      {items.length > 0 && (
        <input
          className={`${inputClass} max-w-sm`}
          placeholder="Buscar en tu producto sellado…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      )}

      {showForm && (
        <SealedPurchaseForm
          onSubmit={async (entity) => {
            await onAdd(entity);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">Todavía no has registrado ningún producto sellado.</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">Sin resultados para esa búsqueda.</p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <SealedItemCard key={item.id} item={item} onRemove={onRemove} onOverrideValue={onOverrideValue} />
          ))}
        </div>
      )}
    </div>
  );
}
