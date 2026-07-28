import { useState } from "react";
import type { CardCondition, CardVariant, CollectionItem, SealedPurchase } from "../../domain/types";
import { costPerCard, formatMoney } from "../../domain/calculations";
import { Badge, badgeToneColors, type BadgeTone } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { inputClass, focusRing } from "../../components/Field";
import { PhotoLightbox } from "../../components/PhotoLightbox";

// Exportado: lo reutiliza también el resumen de "distribución por idioma" en Resumen, para
// no mantener dos mapas de etiquetas de idioma que puedan desincronizarse entre sí.
export const LANGUAGE_LABELS: Record<string, string> = {
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

// De mejor a peor estado, un degradado semántico de verde a rojo — mismo lenguaje que ya
// usaban los tokens --status-* de la app (prioridad, ganancia/pérdida), aplicado ahora
// también a la condición física de la carta.
const CONDITION_TONES: Record<CardCondition, BadgeTone> = {
  mint: "good",
  near_mint: "good",
  excellent: "amber",
  good: "amber",
  light_played: "warning",
  played: "critical",
  poor: "critical",
};

const VARIANT_LABELS: Record<Exclude<CardVariant, "normal">, string> = { reverse: "Reverso", holo: "Holo" };

export function ItemCard({
  item,
  sealedPurchase,
  linkedCardCount,
  onEdit,
  onRemove,
  onOverrideValue,
}: {
  item: CollectionItem;
  /** El sobre/caja del que salió esta carta (`item.sealedPurchaseId`), si lo tiene y sigue
   * existiendo — para poder calcular y mostrar el coste repartido. */
  sealedPurchase: SealedPurchase | null;
  /** Cuántas cartas de toda la colección están vinculadas a ese mismo sobre (incluida esta). */
  linkedCardCount: number;
  onEdit: (item: CollectionItem) => void;
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

  const conditionColor = badgeToneColors[CONDITION_TONES[item.condition]].bg;
  // Coste repartido: nunca se guarda en `item.purchasePrice` (seguiría siendo "no lo sé"
  // si vino de un sobre) — se calcula siempre al vuelo a partir del precio del sobre y
  // cuántas cartas se le han vinculado hasta ahora, para que no se quede desactualizado.
  const estimatedFromPack = sealedPurchase ? costPerCard(sealedPurchase, linkedCardCount) : null;

  return (
    <Card
      variant="gradient"
      className="flex flex-col gap-3"
      // Igual que la prioridad en wishlist: el estado de conservación tiñe toda la
      // tarjeta (verde = mint, ámbar = medio, rojo = jugada), no solo la insignia.
      style={{
        background: `linear-gradient(165deg, color-mix(in srgb, ${conditionColor} 28%, var(--surface-2)) 0%, var(--surface-1) 62%, var(--page) 145%)`,
      }}
    >
      <div className="flex items-start gap-3">
        {item.photo ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={`Ver foto de ${item.name} en grande`}
            className={`shrink-0 rounded-xl ${focusRing}`}
          >
            <img src={item.photo} alt={item.name} loading="lazy" className="w-20 rounded-xl object-cover shadow-card" />
          </button>
        ) : (
          <div
            aria-hidden="true"
            className="flex w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-6 text-2xl text-[var(--text-muted)]"
          >
            🎴
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">{item.name}</p>
          {item.setName && <p className="truncate text-xs text-[var(--text-muted)]">{item.setName}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="info">{LANGUAGE_LABELS[item.language]}</Badge>
            <Badge tone={CONDITION_TONES[item.condition]}>{CONDITION_LABELS[item.condition]}</Badge>
            {item.variant !== "normal" && <Badge tone="amber">✨ {VARIANT_LABELS[item.variant]}</Badge>}
            <span className="text-xs font-semibold text-[var(--text-muted)]">x{item.quantity}</span>
            {item.isGraded && (
              <Badge tone="beacon">
                {item.gradingCompany} {item.grade}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">Comprada por</span>
        <span className="font-semibold text-[var(--text-primary)]">
          {item.purchasePrice !== null ? (
            formatMoney(item.purchasePrice, item.purchaseCurrency)
          ) : estimatedFromPack !== null ? (
            <>
              ≈{formatMoney(estimatedFromPack)}{" "}
              <span className="font-normal text-[var(--text-muted)]">
                (repartido, {linkedCardCount} carta{linkedCardCount === 1 ? "" : "s"})
              </span>
            </>
          ) : (
            "Sin precio (salió de un sobre)"
          )}
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
          <button type="button" onClick={() => setEditingValue(true)} className="font-semibold text-[var(--amber)] hover:underline">
            {item.estimatedValueOverride !== null ? formatMoney(item.estimatedValueOverride) : "Sin valor conocido"}
          </button>
        )}
      </div>

      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => onEdit(item)}
          aria-label={`Editar ejemplar de ${item.name}`}
          className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--gridline)] hover:text-[var(--text-primary)]"
        >
          Editar
        </button>
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
