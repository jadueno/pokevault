import { useState } from "react";
import type { AcquisitionType, CardCondition, CardLanguage, NewCollectionItem, RecognizedCardData } from "../../domain/types";
import { Button } from "../../components/Button";
import { Field, inputClass } from "../../components/Field";

const LANGUAGES: { value: CardLanguage; label: string }[] = [
  { value: "es", label: "Español" },
  { value: "en", label: "Inglés" },
  { value: "fr", label: "Francés" },
  { value: "de", label: "Alemán" },
  { value: "it", label: "Italiano" },
  { value: "pt", label: "Portugués" },
  { value: "ja", label: "Japonés" },
  { value: "ko", label: "Coreano" },
  { value: "zh-cn", label: "Chino simplificado" },
  { value: "zh-tw", label: "Chino tradicional" },
  { value: "id", label: "Indonesio" },
  { value: "th", label: "Tailandés" },
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

const ACQUISITION_TYPES: { value: AcquisitionType; label: string }[] = [
  { value: "purchased_single", label: "Compra de la carta suelta" },
  { value: "pulled_from_pack", label: "Salió de un sobre" },
  { value: "trade", label: "Intercambio" },
  { value: "gift", label: "Regalo" },
];

export function CollectionQuickForm({
  recognized,
  photo,
  onSubmit,
  onCancel,
}: {
  recognized: RecognizedCardData | null;
  photo: string | null;
  onSubmit: (entity: NewCollectionItem) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<NewCollectionItem>({
    name: recognized?.name ?? "",
    setName: recognized?.setName ?? null,
    number: recognized?.number ?? null,
    rarity: recognized?.rarity ?? null,
    language: "es",
    condition: "near_mint",
    quantity: 1,
    acquisitionType: "purchased_single",
    sealedPurchaseId: null,
    purchasePrice: null,
    purchaseCurrency: "EUR",
    purchaseDate: new Date().toISOString().slice(0, 10),
    isGraded: false,
    gradingCompany: null,
    grade: null,
    estimatedValueOverride: null,
    estimatedValueOverrideAt: null,
    estimatedValueOverrideNote: null,
    notes: null,
    photo,
  });
  const [saving, setSaving] = useState(false);

  const cameFromPack = form.acquisitionType === "pulled_from_pack";

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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre">
          <input
            className={inputClass}
            placeholder="Charizard"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Expansión">
          <input
            className={inputClass}
            placeholder="Base Set"
            value={form.setName ?? ""}
            onChange={(e) => setForm({ ...form, setName: e.target.value || null })}
          />
        </Field>
        <Field label="Número">
          <input
            className={inputClass}
            placeholder="4/102"
            value={form.number ?? ""}
            onChange={(e) => setForm({ ...form, number: e.target.value || null })}
          />
        </Field>
        <Field label="Rareza">
          <input
            className={inputClass}
            placeholder="Rare Holo"
            value={form.rarity ?? ""}
            onChange={(e) => setForm({ ...form, rarity: e.target.value || null })}
          />
        </Field>
        <Field label="Idioma">
          <select className={inputClass} value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as CardLanguage })}>
            {LANGUAGES.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Estado">
          <select className={inputClass} value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value as CardCondition })}>
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
        <Field label="¿Cómo la conseguiste?">
          <select
            className={inputClass}
            value={form.acquisitionType}
            onChange={(e) => {
              const acquisitionType = e.target.value as AcquisitionType;
              setForm({
                ...form,
                acquisitionType,
                // Si vino de un sobre, normalmente no hay precio individual real — no se
                // rellena con 0 para no mentir sobre un coste que no se sabe.
                purchasePrice: acquisitionType === "pulled_from_pack" ? null : form.purchasePrice,
              });
            }}
          >
            {ACQUISITION_TYPES.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </Field>
        {!cameFromPack && (
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
        )}
        <Field label="Fecha de compra">
          <input
            type="date"
            className={inputClass}
            value={form.purchaseDate ?? ""}
            onChange={(e) => setForm({ ...form, purchaseDate: e.target.value || null })}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <input
          type="checkbox"
          checked={form.isGraded}
          onChange={(e) => setForm({ ...form, isGraded: e.target.checked, gradingCompany: e.target.checked ? form.gradingCompany : null })}
        />
        Es una carta graduada (PSA, CGC, BGS...)
      </label>

      {form.isGraded && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Empresa de gradación">
            <input
              className={inputClass}
              placeholder="PSA, CGC, BGS..."
              value={form.gradingCompany ?? ""}
              onChange={(e) => setForm({ ...form, gradingCompany: e.target.value })}
            />
          </Field>
          <Field label="Nota">
            <input
              type="number"
              min={1}
              max={10}
              step="0.5"
              className={inputClass}
              value={form.grade ?? ""}
              onChange={(e) => setForm({ ...form, grade: e.target.value ? Number(e.target.value) : null })}
            />
          </Field>
        </div>
      )}

      <Field label="Notas">
        <textarea rows={2} className={inputClass} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />
      </Field>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" tone="beacon" disabled={saving}>
          {saving ? "Guardando…" : "Añadir a mi colección"}
        </Button>
      </div>
    </form>
  );
}
