import { useState } from "react";
import type {
  AcquisitionType,
  CardCondition,
  CardLanguage,
  CardSearchMatch,
  CardVariant,
  CollectionItem,
  NewCollectionItem,
  RecognizedCardData,
  RecognizedPriceData,
  SealedPurchase,
  SetChecklist,
  SetChecklistCard,
} from "../../domain/types";
import { costPerCard, countLinkedCollectionItems, findChecklistCardImage, formatMoney } from "../../domain/calculations";
import { Button } from "../../components/Button";
import { Field, inputClass } from "../../components/Field";
import { SectionLabel } from "../../components/SectionLabel";
import { PhotoLightbox } from "../../components/PhotoLightbox";
import { PhotoCapture } from "./PhotoCapture";
import { PriceScreenshotUpload } from "./PriceScreenshotUpload";

const CONFIDENCE_LABELS: Record<string, string> = { high: "alta", medium: "media", low: "baja" };

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

const VARIANTS: { value: CardVariant; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "reverse", label: "Reverso (foil)" },
  { value: "holo", label: "Holo" },
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
  sealedItems,
  collectionItems,
  checklists,
  cardsByChecklist,
  initialItem = null,
  onRecognizeCard,
  onSearchCards,
  onRecognizePriceScreenshot,
  onSubmit,
  onCancel,
}: {
  /** Sobres/cajas de producto sellado ya registrados, para poder vincular esta carta a
   * uno concreto y repartir su coste. */
  sealedItems: SealedPurchase[];
  /** El resto de la colección, para saber cuántas cartas hay ya vinculadas a cada sobre y
   * poder previsualizar el coste por carta antes de guardar. */
  collectionItems: CollectionItem[];
  /** Sets sincronizados, para poder usar la imagen y el precio oficiales de la carta en
   * vez de dejarlos en blanco (alta manual: la vía principal es marcar cartas desde la
   * pestaña "Sets", esto es la red de seguridad para lo que no está en ningún set). */
  checklists: SetChecklist[];
  cardsByChecklist: Record<string, SetChecklistCard[]>;
  /** Editar un ejemplar ya existente en vez de dar uno de alta: siembra el formulario
   * entero con sus datos y cambia el texto de guardado. */
  initialItem?: CollectionItem | null;
  /** Sugiere nombre/expansión/número/rareza a partir de una foto (modelo de visión local,
   * o un proveedor simulado si no hay Ollama configurado) — solo al dar de alta, nunca al
   * editar. El resultado siempre queda en los campos normales del formulario, revisable y
   * editable antes de guardar; nunca se guarda nada automáticamente. */
  onRecognizeCard: (imageDataUrl: string) => Promise<RecognizedCardData>;
  /** Tras identificar la foto, busca la carta real en el catálogo del proveedor (no hace
   * falta que el set esté sincronizado) para traer datos oficiales (imagen, precio,
   * número y rareza exactos) en vez de quedarse solo con el texto libre de la IA — mismo
   * criterio que ya se usa al marcar una carta desde un set sincronizado. */
  onSearchCards: (name: string, setName: string | null, number: string | null) => Promise<CardSearchMatch[]>;
  /** Red de seguridad para cuando la carta no aparece en el catálogo del proveedor (p. ej.
   * una promo regional que TCGdex no indexa, ver PriceScreenshotUpload): se lee una
   * captura de su página en Cardmarket en vez de la carta física. Solo aporta
   * nombre/expansión/rareza/precio — nunca foto ni número, que esa página no muestra. */
  onRecognizePriceScreenshot: (imageDataUrl: string) => Promise<RecognizedPriceData>;
  onSubmit: (entity: NewCollectionItem) => Promise<void>;
  onCancel: () => void;
}) {
  const isEditing = initialItem !== null;
  const [form, setForm] = useState<NewCollectionItem>({
    name: initialItem?.name ?? "",
    setName: initialItem?.setName ?? null,
    number: initialItem?.number ?? null,
    rarity: initialItem?.rarity ?? null,
    variant: initialItem?.variant ?? "normal",
    language: initialItem?.language ?? "es",
    condition: initialItem?.condition ?? "near_mint",
    quantity: initialItem?.quantity ?? 1,
    acquisitionType: initialItem?.acquisitionType ?? "purchased_single",
    sealedPurchaseId: initialItem?.sealedPurchaseId ?? null,
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
    // Al dar de alta, la foto sale de un set sincronizado si expansión+número coinciden
    // con alguno (ver handleSubmit); si no hay coincidencia, se queda sin foto. Al editar,
    // se parte de la foto que ya tenía por si no hay una coincidencia mejor.
    photo: initialItem?.photo ?? null,
  });
  const [saving, setSaving] = useState(false);
  // Foto que ha hecho el usuario en este mismo alta (distinta de la oficial del set
  // sincronizado o de la carta encontrada en el catálogo, que siguen teniendo prioridad
  // si hay coincidencia — ver handleSubmit).
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognized, setRecognized] = useState<RecognizedCardData | null>(null);
  const [recognizeError, setRecognizeError] = useState<string | null>(null);
  // Búsqueda en el catálogo del proveedor a partir de lo reconocido en la foto — no
  // requiere que el set esté sincronizado. `cardMatches` solo se rellena cuando hay más
  // de un candidato (ambigüedad real); con uno solo se aplica directamente.
  const [searchingCards, setSearchingCards] = useState(false);
  const [cardMatches, setCardMatches] = useState<CardSearchMatch[] | null>(null);
  const [appliedMatch, setAppliedMatch] = useState<CardSearchMatch | null>(null);
  // Foto en grande de un candidato, para poder verlo bien antes de elegir cuál es —
  // independiente de marcarlo como el correcto (ver applyCardMatch).
  const [previewMatch, setPreviewMatch] = useState<CardSearchMatch | null>(null);
  // Mientras haya varias cartas candidatas sin resolver, el formulario entero se oculta:
  // no tiene sentido enseñar campos a medio rellenar hasta que el usuario elija cuál es.
  const hasPendingMatches = cardMatches !== null && cardMatches.length > 0;
  // Alternativa cuando la carta no está en el catálogo del proveedor: subir una captura
  // de su página en Cardmarket y leerla con el mismo modelo de visión.
  const [recognizingPriceScreenshot, setRecognizingPriceScreenshot] = useState(false);
  const [priceScreenshotResult, setPriceScreenshotResult] = useState<RecognizedPriceData | null>(null);
  const [priceScreenshotError, setPriceScreenshotError] = useState<string | null>(null);

  const cameFromPack = form.acquisitionType === "pulled_from_pack";
  const selectedSealedPurchase = form.sealedPurchaseId ? sealedItems.find((s) => s.id === form.sealedPurchaseId) : undefined;
  const projectedLinkedCount = selectedSealedPurchase
    ? countLinkedCollectionItems(selectedSealedPurchase.id, collectionItems) + form.quantity
    : 0;
  const projectedCostPerCard = selectedSealedPurchase ? costPerCard(selectedSealedPurchase, projectedLinkedCount) : null;
  const matchedChecklistCard = findChecklistCardImage(form.setName, form.number, checklists, cardsByChecklist);

  /** Aplica una carta concreta encontrada en el catálogo del proveedor (elegida por el
   * usuario entre varios candidatos, o la única que había): datos oficiales, incluido el
   * precio de referencia como valor estimado — mismo criterio que "Marcar como mías"
   * desde un set sincronizado (ver SetChecklistTab.tsx), solo que aquí sin necesitar el
   * set sincronizado de antemano. */
  function applyCardMatch(match: CardSearchMatch) {
    setAppliedMatch(match);
    setCardMatches(null);
    const now = new Date().toISOString();
    setForm((prev) => ({
      ...prev,
      name: match.name,
      setName: match.setName,
      number: match.number,
      rarity: match.rarity,
      variant: match.variant,
      estimatedValueOverride: match.referencePrice,
      estimatedValueOverrideAt: match.referencePrice !== null ? now : null,
      estimatedValueOverrideNote: match.referencePrice !== null ? "Precio de referencia de Cardmarket (buscador de cartas)" : null,
    }));
  }

  async function handleCapture(dataUrl: string) {
    setCapturedPhoto(dataUrl);
    setRecognized(null);
    setRecognizeError(null);
    setCardMatches(null);
    setAppliedMatch(null);
    setPriceScreenshotResult(null);
    setPriceScreenshotError(null);
    setRecognizing(true);
    try {
      const result = await onRecognizeCard(dataUrl);
      setRecognized(result);
      // Solo se rellenan los campos que la foto sí ha identificado — nunca se borra algo
      // que el usuario ya hubiera escrito a mano con un null del reconocimiento.
      setForm((prev) => ({
        ...prev,
        name: result.name ?? prev.name,
        setName: result.setName ?? prev.setName,
        number: result.number ?? prev.number,
        rarity: result.rarity ?? prev.rarity,
      }));

      if (result.name) {
        setSearchingCards(true);
        try {
          const matches = await onSearchCards(result.name, result.setName, result.number);
          if (matches.length === 1) applyCardMatch(matches[0]);
          else if (matches.length > 1) setCardMatches(matches);
        } finally {
          setSearchingCards(false);
        }
      }
    } catch (e) {
      setRecognizeError(e instanceof Error ? e.message : "No se ha podido identificar la foto");
    } finally {
      setRecognizing(false);
    }
  }

  /** Red de seguridad cuando la carta no está en el catálogo del proveedor: en vez de la
   * carta física, se lee una captura de su página en Cardmarket. Nunca aporta foto ni
   * número (esa página no los muestra) — solo nombre/expansión/rareza/precio, con el mismo
   * criterio de no pisar campos que el usuario ya hubiera rellenado (ver handleCapture). */
  async function handlePriceScreenshot(dataUrl: string) {
    // Si había varias cartas candidatas sin resolver, subir una captura significa "ninguna
    // de esas es" — se cierra ese selector y se pasa a los datos de la captura.
    setCardMatches(null);
    setPriceScreenshotResult(null);
    setPriceScreenshotError(null);
    setRecognizingPriceScreenshot(true);
    try {
      const result = await onRecognizePriceScreenshot(dataUrl);
      setPriceScreenshotResult(result);
      const now = new Date().toISOString();
      setForm((prev) => ({
        ...prev,
        name: result.name ?? prev.name,
        setName: result.setName ?? prev.setName,
        rarity: result.rarity ?? prev.rarity,
        estimatedValueOverride: result.referencePrice ?? prev.estimatedValueOverride,
        estimatedValueOverrideAt: result.referencePrice !== null ? now : prev.estimatedValueOverrideAt,
        estimatedValueOverrideNote:
          result.referencePrice !== null ? "Precio de Cardmarket (captura subida a mano)" : prev.estimatedValueOverrideNote,
      }));
    } catch (e) {
      setPriceScreenshotError(e instanceof Error ? e.message : "No se ha podido leer la captura");
    } finally {
      setRecognizingPriceScreenshot(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      // Prioridad de la foto: la oficial del set sincronizado (si hay coincidencia) > la
      // oficial de la carta encontrada en el catálogo > la que acaba de hacer el usuario >
      // la que ya tenía (al editar) > sin foto.
      const photo =
        matchedChecklistCard?.imageUrlLarge ??
        matchedChecklistCard?.imageUrl ??
        appliedMatch?.imageUrlLarge ??
        appliedMatch?.imageUrl ??
        capturedPhoto ??
        (isEditing ? form.photo : null);
      await onSubmit({ ...form, photo });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!isEditing && (
        <div className="flex flex-col gap-2">
          <PhotoCapture onCapture={handleCapture} />
          {recognizing && <p className="text-sm text-[var(--text-secondary)]">Identificando…</p>}
          {!recognizing && searchingCards && <p className="text-sm text-[var(--text-secondary)]">Buscando la carta oficial…</p>}
          {!recognizing && recognizeError && (
            <p className="text-sm text-[var(--status-critical)]">
              No se ha podido identificar automáticamente ({recognizeError}). Rellena los datos a mano.
            </p>
          )}
          {!recognizing && !searchingCards && recognized && !recognizeError && (
            <p className={`text-sm ${recognized.name ? "text-[var(--status-good)]" : "text-[var(--text-muted)]"}`}>
              {appliedMatch
                ? `Coincide con "${appliedMatch.name}" (${appliedMatch.setName}, #${appliedMatch.number}) — datos oficiales aplicados, revísalos abajo.`
                : cardMatches
                  ? "Hay varias cartas que coinciden — elige la correcta abajo."
                  : recognized.name
                    ? `Identificado${recognized.confidence ? ` (confianza ${CONFIDENCE_LABELS[recognized.confidence]})` : ""}, pero no se ha encontrado en el catálogo: revisa los datos de abajo.`
                    : "No se ha podido identificar nada en la foto. Rellena los datos a mano."}
            </p>
          )}
          {!searchingCards && hasPendingMatches && (
            <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] p-3">
              <SectionLabel>Elige la carta correcta</SectionLabel>
              {cardMatches.map((match) => (
                <div key={match.externalId} className="flex items-center gap-3 rounded-xl border border-[var(--border)] p-2">
                  {match.imageUrl ? (
                    <button
                      type="button"
                      onClick={() => setPreviewMatch(match)}
                      aria-label={`Ver ${match.name} en grande`}
                      className="shrink-0"
                    >
                      <img src={match.imageUrl} alt="" className="w-16 rounded-lg border border-[var(--border)]" />
                    </button>
                  ) : (
                    <div
                      aria-hidden="true"
                      className="flex size-16 shrink-0 items-center justify-center rounded-lg border border-dashed border-[var(--border)] text-lg text-[var(--text-muted)]"
                    >
                      🎴
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => applyCardMatch(match)}
                    aria-label={`Elegir ${match.name} (${match.setName} · #${match.number})`}
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-[var(--gridline)]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{match.name}</p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {match.setName} · #{match.number}
                      </p>
                    </div>
                    {match.referencePrice !== null && (
                      <span className="shrink-0 text-xs font-semibold text-[var(--amber)]">≈{formatMoney(match.referencePrice)}</span>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
          <PriceScreenshotUpload onCapture={handlePriceScreenshot} disabled={recognizing || searchingCards} />
          {recognizingPriceScreenshot && <p className="text-sm text-[var(--text-secondary)]">Leyendo la captura de Cardmarket…</p>}
          {!recognizingPriceScreenshot && priceScreenshotError && (
            <p className="text-sm text-[var(--status-critical)]">
              No se ha podido leer la captura ({priceScreenshotError}). Rellena los datos a mano.
            </p>
          )}
          {!recognizingPriceScreenshot && priceScreenshotResult && !priceScreenshotError && (
            <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] p-3">
              <p className={`text-sm ${priceScreenshotResult.referencePrice !== null ? "text-[var(--status-good)]" : "text-[var(--text-muted)]"}`}>
                {priceScreenshotResult.referencePrice !== null
                  ? `Precio leído de Cardmarket${priceScreenshotResult.name ? ` (${priceScreenshotResult.name})` : ""} — el modelo local a veces confunde la coma decimal, comprueba que sea correcto:`
                  : "No se ha podido leer el precio en la captura. Rellena los datos a mano."}
              </p>
              {priceScreenshotResult.referencePrice !== null && (
                <Field label="Precio de referencia (€)">
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    className={inputClass}
                    value={form.estimatedValueOverride ?? ""}
                    onChange={(e) => setForm({ ...form, estimatedValueOverride: e.target.value ? Number(e.target.value) : null })}
                  />
                </Field>
              )}
            </div>
          )}
        </div>
      )}

      {previewMatch && (
        <PhotoLightbox
          src={previewMatch.imageUrlLarge ?? previewMatch.imageUrl ?? ""}
          alt={previewMatch.name}
          onClose={() => setPreviewMatch(null)}
        />
      )}

      {!hasPendingMatches && (
      <>
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
        <Field label="Variante">
          <select className={inputClass} value={form.variant} onChange={(e) => setForm({ ...form, variant: e.target.value as CardVariant })}>
            {VARIANTS.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}
              </option>
            ))}
          </select>
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
              <p className="text-sm text-[var(--text-muted)] sm:col-span-2">
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

      <p className="text-sm text-[var(--text-muted)]">
        {matchedChecklistCard ? (
          <>🖼️ Se guardará la imagen oficial de "{matchedChecklistCard.name}" (set sincronizado).</>
        ) : appliedMatch?.imageUrl ? (
          <>🖼️ Se guardará la imagen oficial de "{appliedMatch.name}" (encontrada en el catálogo).</>
        ) : capturedPhoto ? (
          <>📷 Se guardará la foto que acabas de hacer.</>
        ) : isEditing ? (
          <>📷 Se mantiene la foto que ya tenía.</>
        ) : (
          <>
            📷 Sin foto: expansión/número no coinciden con ningún set sincronizado todavía. Puedes sincronizar el set desde la
            pestaña "Sets", o hacer una foto arriba.
          </>
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
      </>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        {!hasPendingMatches && (
          <Button type="submit" tone="beacon" disabled={saving}>
            {saving ? "Guardando…" : isEditing ? "Guardar cambios" : "Añadir a mi colección"}
          </Button>
        )}
      </div>
    </form>
  );
}
