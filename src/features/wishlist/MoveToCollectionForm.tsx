import { useState } from "react";
import type { CardCondition, CardLanguage, MoveToCollectionDetails } from "../../domain/types";
import { Button } from "../../components/Button";
import { Field, inputClass } from "../../components/Field";
import { Modal } from "../../components/Modal";

const LANGUAGES: { value: CardLanguage; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "fr", label: "Francés" },
  { value: "de", label: "Alemán" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Portugués" },
  { value: "ja", label: "Japonés" },
  { value: "ko", label: "Coreano" },
];

const CONDITIONS: { value: CardCondition; label: string }[] = [
  { value: "mint", label: "Mint" },
  { value: "near_mint", label: "Near Mint" },
  { value: "excellent", label: "Excellent" },
  { value: "good", label: "Good" },
  { value: "light_played", label: "Light Played" },
  { value: "played", label: "Played" },
  { value: "poor", label: "Poor" },
];

export function MoveToCollectionForm({
  cardName,
  onSubmit,
  onCancel,
}: {
  cardName: string;
  onSubmit: (details: MoveToCollectionDetails) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<MoveToCollectionDetails>({
    language: "es",
    condition: "near_mint",
    quantity: 1,
    purchasePrice: null,
    purchaseCurrency: "EUR",
    purchaseDate: new Date().toISOString().slice(0, 10),
    notes: null,
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
    <Modal title={`Registrar la compra de ${cardName}`} onClose={onCancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Idioma">
            <select
              className={inputClass}
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value as CardLanguage })}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado">
            <select
              className={inputClass}
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value as CardCondition })}
            >
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
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
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" tone="beacon" disabled={saving}>
            {saving ? "Guardando…" : "Registrar compra"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
