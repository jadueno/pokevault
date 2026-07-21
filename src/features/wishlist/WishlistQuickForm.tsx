import { useState } from "react";
import type { NewWishlistItem, WishlistPriority } from "../../domain/types";
import { Button } from "../../components/Button";
import { Field, inputClass } from "../../components/Field";
import { PhotoField } from "../../components/PhotoField";

const PRIORITIES: { value: WishlistPriority; label: string }[] = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
];

export function WishlistQuickForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (entity: NewWishlistItem) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<NewWishlistItem>({
    name: "",
    setName: null,
    priority: "medium",
    maxPrice: null,
    targetMonth: null,
    notes: null,
    photo: null,
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PhotoField photo={form.photo} onChange={(photo) => setForm({ ...form, photo })} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre">
          <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <Field label="Expansión">
          <input className={inputClass} value={form.setName ?? ""} onChange={(e) => setForm({ ...form, setName: e.target.value || null })} />
        </Field>
        <Field label="Prioridad">
          <select className={inputClass} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as WishlistPriority })}>
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Precio máximo (€)">
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={form.maxPrice ?? ""}
            onChange={(e) => setForm({ ...form, maxPrice: e.target.value ? Number(e.target.value) : null })}
          />
        </Field>
        <Field label="Mes objetivo">
          <input type="month" className={inputClass} value={form.targetMonth ?? ""} onChange={(e) => setForm({ ...form, targetMonth: e.target.value || null })} />
        </Field>
      </div>
      <Field label="Notas">
        <textarea rows={2} className={inputClass} value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value || null })} />
      </Field>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" tone="beacon" disabled={saving}>
          {saving ? "Guardando…" : "Añadir a la wishlist"}
        </Button>
      </div>
    </form>
  );
}
