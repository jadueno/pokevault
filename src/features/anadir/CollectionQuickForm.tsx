import { useState } from "react";
import type {
  AcquisitionType,
  CardCondition,
  CardLanguage,
  CollectionItem,
  NewCollectionItem,
  RecognizedCardData,
  SealedPurchase,
  SetChecklist,
  SetChecklistCard,
} from "../../domain/types";
import { costPerCard, countLinkedCollectionItems, findChecklistCardImage, formatMoney } from "../../domain/calculations";
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
  sealedItems,
  collectionItems,
  checklists,
  cardsByChecklist,
  initialSealedPurchaseId = null,
  initialItem = null,
  onSubmit,
  onCancel,
}: {
  recognized: RecognizedCardData | null;
  /** Sobres/cajas de producto sellado ya registrados, para poder vincular esta carta a
   * uno concreto y repartir su coste. */
  sealedItems: SealedPurchase[];
  /** El resto de la colección, para saber cuántas cartas hay ya vinculadas a cada sobre y
   * poder previsualizar el coste por carta antes de guardar. */
  collectionItems: CollectionItem[];
  /** Sets sincronizados, para poder usar la imagen oficial de la carta en vez de la foto
   * que hizo el usuario (esa foto solo sirve para que la IA autocomplete el texto). */
  checklists: SetChecklist[];
  cardsByChecklist: Record<string, SetChecklistCard[]>;
  /** Preseleccionar un sobre (p. ej. para seguir añadiendo cartas del mismo sobre sin tener
   * que volver a elegirlo en cada foto — ver "sticky sobre" en AnadirScreen). */
  initialSealedPurchaseId?: string | null;
  /** Editar un ejemplar ya existente en vez de dar uno de alta: siembra el formulario
   * entero con sus datos (no solo lo que reconocería la IA) y cambia el texto de guardado.
   * No hay foto nueva que reconocer al editar, así que `recognized` no aplica aquí. */
  initialItem?: CollectionItem | null;
  onSubmit: (entity: NewCollectionItem) => Promise<void>;
  onCancel: () => void;
}) {
  const isEditing = initialItem !== null;
  const [form, setForm] = useState<NewCollectionItem>({
    name: initialItem?.name ?? recognized?.name ?? "",
    setName: initialItem?.setName ?? recognized?.setName ?? null,
    number: initialItem?.number ?? recognized?.number ?? null,
    rarity: initialItem?.rarity ?? recognized?.rarity ?? null,
    language: initialItem?.language ?? "es",
    condition: initialItem?.condition ?? "near_mint",
    quantity: initialItem?.quantity ?? 1,
    acquisitionType: initialItem?.acquisitionType ?? (initialSealedPurchaseId ? "pulled_from_pack" : "purchased_single"),
    sealedPurchaseId: initialItem?.sealedPurchaseId ?? initialSealedPurchaseId,
    purchasePrice: initialItem?.purchasePrice ?? null,
    purchaseCurrency: initialItem?.purchaseCurrency ?? "EUR",
    purchaseDate: initialItem?.purchaseDate ?? new Date().toISOString().slice(0, 10),
    isGraded: initialItem?.isGraded ?? false,
    gradingCompany: initialItem?.gradingCompany ?? null,
    grade: initialItem?.grade ?? null,
    estimatedValueOverride: initialItem?.estimatedValueOverride ?? null,
    estimatedValueOverrideAt: initialItem?.estimatedValueOverrideAt ?? null,
    estimatedValueOverrideNote: initialItem?.estimatedValueOverrideNote ?? null,
    notes: initialItem?.notes ?? null,
    // Al dar de alta, la foto que hizo el usuario nunca se guarda — solo sirvió para que
    // la IA autocompletara el texto, la foto final (si hay) se busca entre los sets
    // sincronizados. Al editar, se parte de la foto que ya tenía (por si no hay una
    // coincidencia mejor en handleSubmit).
    photo: initialItem?.photo ?? null,
  });
  const [saving, setSaving] = useState(false);

  const cameFromPack = form.acquisitionType === "pulled_from_pack";
  const selectedSealedPurchase = form.sealedPurchaseId ? sealedItems.find((s) => s.id === form.sealedPurchaseId) : undefined;
  const projectedLinkedCount = selectedSealedPurchase
    ? countLinkedCollectionItems(selectedSealedPurchase.id, collectionItems) + form.quantity
    : 0;
  const projectedCostPerCard = selectedSealedPurchase ? costPerCard(selectedSealedPurchase, projectedLinkedCount) : null;
  const matchedChecklistCard = findChecklistCardImage(form.setName, form.number, checklists, cardsByChecklist);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Una coincidencia nueva (p. ej. tras editar la expansión/número) siempre gana. Sin
      // coincidencia: al editar se conserva la foto que ya tenía, al dar de alta se queda
      // sin foto (nunca se guarda la instantánea del usuario).
      const photo = matchedChecklistCard?.imageUrlLarge ?? matchedChecklistCard?.imageUrl ?? (isEditing ? form.photo : null);
      await onSubmit({ ...form, photo });
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
                sealedPurchaseId: acquisitionType === "pulled_from_pack" ? form.sealedPurchaseId : null,
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
        {cameFromPack && (
          <>
            {/* El texto de ayuda va fuera de <Field> a propósito: si viviera dentro del
                mismo <label> que el <select>, se colaría en su nombre accesible (lo que
                lee un lector de pantalla, y también lo que usan las queries de test por
                label) — el <select> pasaría a "llamarse" "¿De qué sobre? Con esta carta
                serían…" en vez de solo "¿De qué sobre?". */}
            <Field label="¿De qué sobre?">
              <select
                className={inputClass}
                value={form.sealedPurchaseId ?? ""}
                onChange={(e) => setForm({ ...form, sealedPurchaseId: e.target.value || null })}
              >
                <option value="">Sin sobre concreto (no reparte coste)</option>
                {sealedItems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.productName}
                    {s.purchaseDate ? ` — ${s.purchaseDate}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            {projectedCostPerCard !== null && (
              <p className="text-xs text-[var(--text-muted)] sm:col-span-2">
                Con esta carta serían {projectedLinkedCount} de este sobre →{" "}
                <span className="font-semibold text-[var(--amber)]">≈{formatMoney(projectedCostPerCard)}/carta</span>
              </p>
            )}
          </>
        )}
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

      <p className="text-xs text-[var(--text-muted)]">
        {matchedChecklistCard ? (
          <>🖼️ Se guardará la imagen oficial de "{matchedChecklistCard.name}"{isEditing ? "" : " (no la foto que has hecho)"}.</>
        ) : isEditing ? (
          <>📷 Se mantiene la foto que ya tenía.</>
        ) : (
          <>📷 La foto solo se ha usado para autocompletar estos datos — no hay imagen oficial disponible para este set/número todavía.</>
        )}
      </p>

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
          {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Añadir a mi colección"}
        </Button>
      </div>
    </form>
  );
}
