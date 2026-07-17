import { useState } from "react";
import type { NewPlanItem, PlanCategory, PlanItem, PlanSettings, ShoppingLink } from "../../domain/types";
import {
  PLAN_CATEGORIES,
  PLAN_CATEGORY_LABELS,
  estimatePlanMonth,
  formatMoney,
  groupPlanByMonth,
  monthLabel,
  splitReferencePrice,
} from "../../domain/calculations";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { inputClass } from "../../components/Field";
import { ScreenHeader } from "../../components/ScreenHeader";
import { PlanSettingsForm } from "./PlanSettingsForm";

function ShoppingLinksCard({
  settings,
  onUpdateSettings,
}: {
  settings: PlanSettings;
  onUpdateSettings: (entity: PlanSettings) => Promise<void>;
}) {
  const confirm = useConfirm();
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveLinks(links: ShoppingLink[]) {
    setSaving(true);
    try {
      await onUpdateSettings({ ...settings, shoppingLinks: links });
    } finally {
      setSaving(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    const newLink: ShoppingLink = { label: label.trim(), url: url.trim() };
    if (note.trim()) newLink.note = note.trim();
    await saveLinks([...settings.shoppingLinks, newLink]);
    setLabel("");
    setUrl("");
    setNote("");
  }

  async function handleRemove(index: number) {
    const link = settings.shoppingLinks[index];
    if (await confirm(`¿Quitar "${link.label}" de las páginas de compra?`)) {
      await saveLinks(settings.shoppingLinks.filter((_, i) => i !== index));
    }
  }

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <p className="text-xs font-bold tracking-wide text-[var(--text-muted)] uppercase">Páginas donde comprar</p>
        <p className="text-xs text-[var(--text-muted)]">Qué tipo de compra encaja en cada tienda, para tenerlo a mano mientras repasas el plan.</p>
      </div>

      {settings.shoppingLinks.length > 0 && (
        <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {settings.shoppingLinks.map((link, i) => (
            <li
              key={i}
              className="flex flex-col gap-1 rounded-2xl border p-3"
              style={{
                backgroundColor: "color-mix(in srgb, var(--amber) 10%, var(--surface-1))",
                borderColor: "color-mix(in srgb, var(--amber) 28%, transparent)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <a
                  href={link.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-[var(--amber)] hover:underline"
                >
                  {link.label}
                  <span aria-hidden="true"> ↗</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  aria-label={`Quitar ${link.label} de las páginas de compra`}
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--status-critical)]"
                >
                  ×
                </button>
              </div>
              {link.note && <p className="text-xs leading-snug text-[var(--text-secondary)]">{link.note}</p>}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="flex flex-col gap-2 border-t border-[var(--gridline)] pt-3">
        <div className="flex flex-wrap gap-2">
          <input
            className={`${inputClass} w-auto min-w-32 flex-1 py-1.5 text-sm`}
            placeholder="Nombre, p. ej. Cardmarket"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <input
            className={`${inputClass} w-auto min-w-48 flex-[2] py-1.5 text-sm`}
            placeholder="https://..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className={`${inputClass} min-w-48 flex-1 py-1.5 text-sm`}
            placeholder="Nota: para qué compras aquí (opcional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button type="submit" size="sm" variant="ghost" disabled={saving || !label.trim() || !url.trim()} className="shrink-0">
            + Añadir página
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Descripción de un ítem con su precio de referencia embebido (si lo tiene) resaltado
 * tipográficamente en vez de mezclado en la misma frase sin jerarquía. */
function ItemDescription({ description, done }: { description: string; done: boolean }) {
  const { before, refPrice, after } = splitReferencePrice(description);
  const baseClass = done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]";
  return (
    <span className={baseClass}>
      {before}
      {refPrice && <span className={done ? "font-bold" : "font-bold text-[var(--amber)]"}>{refPrice}</span>}
      {after}
    </span>
  );
}

function PlanItemRow({
  item,
  onToggleDone,
  onUpdate,
  onRemove,
}: {
  item: PlanItem;
  onToggleDone: (id: string) => Promise<void>;
  onUpdate: (id: string, entity: NewPlanItem) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(item.description);
  const [copied, setCopied] = useState(false);

  function stripId(item: PlanItem): NewPlanItem {
    const { id: _id, ...rest } = item;
    return rest;
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(item.description);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleSave() {
    const description = text.trim();
    if (!description || description === item.description) {
      setText(item.description);
      setEditing(false);
      return;
    }
    await onUpdate(item.id, { ...stripId(item), description });
    setEditing(false);
  }

  async function handleRemove() {
    if (await confirm(`¿Quitar "${item.description}" del plan?`)) {
      await onRemove(item.id);
    }
  }

  return (
    <li className="flex items-start gap-2.5 rounded-xl px-2 py-1.5 hover:bg-[var(--gridline)]">
      <input
        type="checkbox"
        checked={item.done}
        onChange={() => onToggleDone(item.id)}
        aria-label={`Marcar "${item.description}" como hecho`}
        className="mt-1 size-4 shrink-0 accent-[var(--status-good)]"
      />
      {editing ? (
        <input
          autoFocus
          className={`${inputClass} flex-1 py-1 text-sm`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") {
              setText(item.description);
              setEditing(false);
            }
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="flex-1 py-1 text-left text-sm leading-snug break-words whitespace-normal"
        >
          <ItemDescription description={item.description} done={item.done} />
        </button>
      )}
      <button
        type="button"
        onClick={handleCopy}
        aria-label={`Copiar "${item.description}"`}
        className="mt-1 shrink-0 rounded-lg px-1.5 py-0.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--beacon)]"
      >
        {copied ? "✓" : "📋"}
      </button>
      <button
        type="button"
        onClick={handleRemove}
        aria-label={`Quitar ${item.description} del plan`}
        className="mt-1 shrink-0 rounded-lg px-1.5 py-0.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--status-critical)]"
      >
        ×
      </button>
    </li>
  );
}

function AddPlanItemRow({ onAdd, autoFocus = false }: { onAdd: (description: string) => Promise<void>; autoFocus?: boolean }) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const description = text.trim();
    if (!description) return;
    setAdding(true);
    try {
      await onAdd(description);
      setText("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-2 pt-1">
      <input
        autoFocus={autoFocus}
        className={`${inputClass} flex-1 py-1 text-sm`}
        placeholder="Añadir ítem…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <Button type="submit" size="sm" variant="ghost" disabled={adding || !text.trim()}>
        + Añadir
      </Button>
    </form>
  );
}

/** Categoría del mes sin ningún ítem todavía: en vez de una columna vacía siempre
 * visible, un chip discreto que revela el formulario de alta al pulsarlo — así no hay
 * ruido visual en los (muchos) meses sin nada que "guardar sellado", por ejemplo, pero
 * se puede seguir añadiendo el primer ítem de esa categoría en cualquier mes. */
function EmptyCategorySlot({
  category,
  onAdd,
}: {
  category: PlanCategory;
  onAdd: (description: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);

  if (open) {
    return (
      <div className="min-w-64 flex-1 rounded-2xl border border-dashed border-[var(--gridline)] p-3">
        <p className="px-2 pb-1 text-xs font-bold tracking-wide text-[var(--text-muted)] uppercase">
          {PLAN_CATEGORY_LABELS[category]}
        </p>
        <AddPlanItemRow autoFocus onAdd={onAdd} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={`Añadir ítem a ${PLAN_CATEGORY_LABELS[category]}`}
      className="rounded-full border border-dashed border-[var(--gridline)] px-3 py-1.5 text-xs font-bold text-[var(--text-muted)] transition-colors hover:border-solid hover:text-[var(--text-primary)]"
    >
      + {PLAN_CATEGORY_LABELS[category]}
    </button>
  );
}

function MonthSection({
  month,
  byCategory,
  monthlyBudget,
  onAdd,
  onToggleDone,
  onUpdate,
  onRemove,
}: {
  month: string;
  byCategory: Record<PlanCategory, PlanItem[]>;
  monthlyBudget: number | null;
  onAdd: (category: PlanCategory, description: string) => Promise<void>;
  onToggleDone: (id: string) => Promise<void>;
  onUpdate: (id: string, entity: NewPlanItem) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
}) {
  const estimate = estimatePlanMonth({ month, byCategory });
  const overBudget = monthlyBudget !== null && estimate.amount > monthlyBudget;
  const nonEmptyCategories = PLAN_CATEGORIES.filter((c) => byCategory[c].length > 0);
  const emptyCategories = PLAN_CATEGORIES.filter((c) => byCategory[c].length === 0);
  const progressPct = estimate.totalCount > 0 ? Math.round((estimate.doneCount / estimate.totalCount) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 className="font-[family-name:var(--font-display)] text-sm font-bold tracking-wide text-[var(--text-secondary)] uppercase">
          {monthLabel(month)}
        </h2>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
          {estimate.totalCount > 0 && (
            <span>
              <span className="font-bold text-[var(--text-secondary)]">
                {estimate.doneCount}/{estimate.totalCount}
              </span>{" "}
              hechos
            </span>
          )}
          {estimate.pricedCount > 0 && (
            <span title="Suma los ítems de 'Comprar' y 'Abrir' con precio de referencia en el texto — no incluye 'Guardar sellado', ya que no es un gasto nuevo. Aproximado.">
              Estimado{" "}
              <span className="font-bold" style={{ color: overBudget ? "var(--status-critical)" : "var(--status-good)" }}>
                {formatMoney(estimate.amount)}
              </span>
              {monthlyBudget !== null && <> / {formatMoney(monthlyBudget)}</>}
            </span>
          )}
        </div>
      </div>

      {estimate.totalCount > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--gridline)]" role="presentation">
          <div
            className="h-full rounded-full bg-[var(--status-good)] transition-[width] duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {nonEmptyCategories.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          {nonEmptyCategories.map((category) => (
            <Card key={category} className="flex min-w-64 flex-1 basis-64 flex-col gap-1.5 p-3 sm:p-4">
              <p className="px-2 text-xs font-bold tracking-wide text-[var(--text-muted)] uppercase">
                {PLAN_CATEGORY_LABELS[category]}
              </p>
              <ul className="flex flex-col">
                {byCategory[category].map((item) => (
                  <PlanItemRow key={item.id} item={item} onToggleDone={onToggleDone} onUpdate={onUpdate} onRemove={onRemove} />
                ))}
              </ul>
              <AddPlanItemRow onAdd={(description) => onAdd(category, description)} />
            </Card>
          ))}
        </div>
      )}

      {emptyCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {emptyCategories.map((category) => (
            <EmptyCategorySlot key={category} category={category} onAdd={(description) => onAdd(category, description)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function PlanScreen({
  items,
  settings,
  onAdd,
  onUpdate,
  onRemove,
  onToggleDone,
  onUpdateSettings,
}: {
  items: PlanItem[];
  settings: PlanSettings | null;
  onAdd: (entity: NewPlanItem) => Promise<void>;
  onUpdate: (id: string, entity: NewPlanItem) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onToggleDone: (id: string) => Promise<void>;
  onUpdateSettings: (entity: PlanSettings) => Promise<void>;
}) {
  const [showSettings, setShowSettings] = useState(false);
  const groups = groupPlanByMonth(items);

  async function handleAdd(month: string, category: PlanCategory, description: string) {
    const position = items.filter((i) => i.month === month && i.category === category).length;
    await onAdd({ month, category, description, done: false, position });
  }

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Plan" subtitle="Tu objetivo de compra mes a mes." />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-secondary)]">
          "Hecho" es solo una casilla de seguimiento: no registra la compra en tu colección ni cuenta en el valor
          total — para eso, usa "Ya la tengo" desde Añadir o Wishlist.
        </p>
        <Button variant="tint" onClick={() => setShowSettings(true)} className="shrink-0">
          Ajustes del plan
        </Button>
      </div>

      {settings && <ShoppingLinksCard settings={settings} onUpdateSettings={onUpdateSettings} />}

      {settings && (
        <Card className="flex flex-col gap-3">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Presupuesto mensual</p>
            <p className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--amber)]">
              {formatMoney(settings.monthlyBudget)}
            </p>
          </div>
          {(settings.yearRules || settings.yearGoal) && (
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-bold tracking-wide text-[var(--text-muted)] uppercase transition-colors hover:text-[var(--text-primary)] [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">
                  ›
                </span>
                Reglas y objetivo del año
              </summary>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                {settings.yearRules && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--text-muted)]">Reglas del año</p>
                    <p className="text-sm whitespace-pre-line text-[var(--text-secondary)]">{settings.yearRules}</p>
                  </div>
                )}
                {settings.yearGoal && (
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[var(--text-muted)]">Objetivo al terminar</p>
                    <p className="text-sm whitespace-pre-line text-[var(--text-secondary)]">{settings.yearGoal}</p>
                  </div>
                )}
              </div>
            </details>
          )}
        </Card>
      )}

      {showSettings && settings && (
        <PlanSettingsForm
          settings={settings}
          onSubmit={async (entity) => {
            await onUpdateSettings(entity);
            setShowSettings(false);
          }}
          onCancel={() => setShowSettings(false)}
        />
      )}

      {groups.length === 0 ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">🗓️ Todavía no hay ítems en el plan.</p>
        </Card>
      ) : (
        groups.map((group) => (
          <MonthSection
            key={group.month}
            month={group.month}
            byCategory={group.byCategory}
            monthlyBudget={settings?.monthlyBudget ?? null}
            onAdd={(category, description) => handleAdd(group.month, category, description)}
            onToggleDone={onToggleDone}
            onUpdate={onUpdate}
            onRemove={onRemove}
          />
        ))
      )}
    </div>
  );
}
