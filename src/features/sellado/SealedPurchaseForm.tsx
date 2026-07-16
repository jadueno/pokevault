import { useState } from "react";
import type { NewSealedPurchase, SealedProductType } from "../../domain/types";
import { Button } from "../../components/Button";
import { Field, inputClass } from "../../components/Field";
import { Modal } from "../../components/Modal";

const PRODUCT_TYPES: { value: SealedProductType; label: string }[] = [
  { value: "booster_pack", label: "Sobre" },
  { value: "booster_box", label: "Caja de sobres" },
  { value: "elite_trainer_box", label: "Elite Trainer Box" },
  { value: "bundle", label: "Bundle" },
  { value: "tin", label: "Lata" },
  { value: "other", label: "Otro" },
];

export function SealedPurchaseForm({
  initialName,
  photo,
  onSubmit,
  onCancel,
}: {
  initialName?: string;
  photo?: string | null;
  onSubmit: (entity: NewSealedPurchase) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<NewSealedPurchase>({
    productName: initialName ?? "",
    productType: "booster_pack",
    quantity: 1,
    purchasePrice: null,
    purchaseCurrency: "EUR",
    purchaseDate: new Date().toISOString().slice(0, 10),
    estimatedValueOverride: null,
    estimatedValueOverrideAt: null,
    estimatedValueOverrideNote: null,
    location: null,
    notes: null,
    photo: photo ?? null,
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nueva compra de producto sellado" onClose={onCancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Nombre del producto">
          <input
            className={inputClass}
            placeholder="Sobre Evoluciones Prismáticas"
            value={form.productName}
            onChange={(e) => setForm({ ...form, productName: e.target.value })}
            required
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tipo">
            <select
              className={inputClass}
              value={form.productType}
              onChange={(e) => setForm({ ...form, productType: e.target.value as SealedProductType })}
            >
              {PRODUCT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cantidad">
            <input
              type="number"
              min={1}
              className={inputClass}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
          </Field>
          <Field label="Precio de compra (€)">
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={form.purchasePrice ?? ""}
              onChange={(e) => setForm({ ...form, purchasePrice: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
          <Field label="Fecha de compra">
            <input
              type="date"
              className={inputClass}
              value={form.purchaseDate ?? ""}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value || null })}
            />
          </Field>
        </div>
        <Field label="Ubicación física">
          <input
            className={inputClass}
            placeholder="Cajón del salón..."
            value={form.location ?? ""}
            onChange={(e) => setForm({ ...form, location: e.target.value || null })}
          />
        </Field>
        <Field label="Notas">
          <textarea
            rows={2}
            className={inputClass}
            value={form.notes ?? ""}
            onChange={(e) => setForm({ ...form, notes: e.target.value || null })}
          />
        </Field>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" tone="beacon" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
