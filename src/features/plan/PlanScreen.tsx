import { useEffect, useRef, useState } from "react";
import type { NewPlanItem, PlanCategory, PlanItem, PlanSettings, ShoppingLink } from "../../domain/types";
import { PLAN_CATEGORIES, PLAN_CATEGORY_LABELS, estimatePlanMonth, formatMoney, groupPlanByMonth, monthLabel } from "../../domain/calculations";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { Field, inputClass } from "../../components/Field";
import { CheckIcon, CopyIcon, PencilIcon } from "../../components/icons";
import { IconButton } from "../../components/IconButton";
import { Modal } from "../../components/Modal";
import { ScreenHeader } from "../../components/ScreenHeader";
import { SectionLabel } from "../../components/SectionLabel";
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
  // null = formulario de alta; si no, índice del enlace que se está editando — reutiliza
  // el mismo formulario en vez de uno aparte, mismo criterio de simplicidad que el resto
  // de altas rápidas de la app.
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const isEditing = editingIndex !== null;
  // El formulario es el mismo para alta y edición, y vive debajo de la lista — con varios
  // enlaces guardados puede quedar fuera de la vista al pulsar "Editar" en uno de arriba.
  // Encontrado en real: el usuario pulsaba el lápiz, el formulario sí se rellenaba, pero al
  // no verlo (sin hacer scroll) parecía que el botón no hacía nada.
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isEditing) formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [isEditing, editingIndex]);

  async function saveLinks(links: ShoppingLink[]) {
    setSaving(true);
    try {
      await onUpdateSettings({ ...settings, shoppingLinks: links });
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setLabel("");
    setUrl("");
    setNote("");
    setEditingIndex(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    const link: ShoppingLink = { label: label.trim(), url: url.trim() };
    if (note.trim()) link.note = note.trim();
    const links =
      editingIndex !== null
        ? settings.shoppingLinks.map((l, i) => (i === editingIndex ? link : l))
        : [...settings.shoppingLinks, link];
    await saveLinks(links);
    resetForm();
  }

  function handleEdit(index: number) {
    const link = settings.shoppingLinks[index];
    setLabel(link.label);
    setUrl(link.url);
    setNote(link.note ?? "");
    setEditingIndex(index);
  }

  async function handleRemove(index: number) {
    const link = settings.shoppingLinks[index];
    if (await confirm(`¿Quitar "${link.label}" de las páginas de compra?`)) {
      if (editingIndex === index) resetForm();
      await saveLinks(settings.shoppingLinks.filter((_, i) => i !== index));
    }
  }

  return (
    <Card>
      {/* Cerrada por defecto: el contenido (lista de enlaces + formulario de alta) no es
       * algo que se consulte en cada visita al Plan, así que no hace falta que ocupe
       * espacio siempre — mismo patrón <details> ya usado en "Reglas y objetivo del año"
       * y en la cabecera de cada mes. */}
      <details className="group">
        <summary className="flex cursor-pointer items-center gap-1.5 [&::-webkit-details-marker]:hidden">
          <span aria-hidden="true" className="inline-block text-[var(--text-muted)] transition-transform group-open:rotate-90">
            ›
          </span>
          <SectionLabel>Páginas donde comprar</SectionLabel>
        </summary>

        <div className="mt-3 flex flex-col gap-3">
          <p className="text-sm text-[var(--text-muted)]">Qué tipo de compra encaja en cada tienda, para tenerlo a mano mientras repasas el plan.</p>

          {settings.shoppingLinks.length > 0 && (
            <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {settings.shoppingLinks.map((link, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-1 rounded-2xl border p-3"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--amber) 10%, var(--surface-1))",
                    borderColor:
                      editingIndex === i
                        ? "var(--amber)"
                        : "color-mix(in srgb, var(--amber) 28%, transparent)",
                    boxShadow: editingIndex === i ? "0 0 0 2px var(--amber)" : undefined,
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
                    <div className="flex shrink-0 items-center gap-1">
                      <IconButton onClick={() => handleEdit(i)} label={`Editar ${link.label}`}>
                        <PencilIcon className="size-4" />
                      </IconButton>
                      <IconButton
                        tone="danger"
                        onClick={() => handleRemove(i)}
                        label={`Quitar ${link.label} de las páginas de compra`}
                      >
                        ×
                      </IconButton>
                    </div>
                  </div>
                  {link.note && <p className="text-xs leading-snug text-[var(--text-secondary)]">{link.note}</p>}
                </li>
              ))}
            </ul>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-[var(--gridline)] pt-3">
            {isEditing && (
              <p className="text-xs font-bold tracking-wide text-[var(--amber)] uppercase">
                Editando "{settings.shoppingLinks[editingIndex].label}"
              </p>
            )}
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
              {isEditing && (
                <Button type="button" size="sm" variant="ghost" onClick={resetForm} className="shrink-0">
                  Cancelar
                </Button>
              )}
              <Button type="submit" size="sm" variant="ghost" disabled={saving || !label.trim() || !url.trim()} className="shrink-0">
                {isEditing ? "Guardar cambios" : "+ Añadir página"}
              </Button>
            </div>
          </form>
        </div>
      </details>
    </Card>
  );
}

/** Descripción de un ítem con su precio de referencia y su término de búsqueda —ahora
 * campos propios, ya no texto embebido— resaltados tipográficamente para distinguirlos
 * de un vistazo en vez de mezclarlos en la misma frase sin jerarquía. */
function ItemDescription({ item }: { item: PlanItem }) {
  const baseClass = item.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]";
  return (
    <span className={baseClass}>
      {item.description}
      {item.referencePrice !== null && (
        <span className={item.done ? "font-semibold" : "font-semibold text-[var(--amber)]"}> (ref. {formatMoney(item.referencePrice)})</span>
      )}
      {item.searchTerm && <span className="text-[var(--text-muted)] italic"> 🔍 {item.searchTerm}</span>}
      {item.countedElsewhere && (
        <span
          className="text-[var(--text-muted)]"
          title="Ya está registrado con su precio real en Colección/Sellado — no se suma de nuevo en Invertido"
        >
          {" "}
          · ya contado en Colección/Sellado
        </span>
      )}
    </span>
  );
}

function stripId(item: PlanItem): NewPlanItem {
  const { id: _id, ...rest } = item;
  return rest;
}

/** Modal de edición completa de un ítem del plan: descripción, precio de referencia y
 * término de búsqueda, todos editables (antes solo la descripción, con el precio
 * embebido como texto sin poder tocarlo por separado). */
function PlanItemEditForm({
  item,
  onSubmit,
  onClose,
}: {
  item: PlanItem;
  onSubmit: (entity: NewPlanItem) => Promise<void>;
  onClose: () => void;
}) {
  const [description, setDescription] = useState(item.description);
  const [referencePrice, setReferencePrice] = useState(item.referencePrice !== null ? String(item.referencePrice) : "");
  const [searchTerm, setSearchTerm] = useState(item.searchTerm ?? "");
  const [countedElsewhere, setCountedElsewhere] = useState(item.countedElsewhere);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedDescription = description.trim();
    if (!trimmedDescription) return;
    setSaving(true);
    try {
      await onSubmit({
        ...stripId(item),
        description: trimmedDescription,
        referencePrice: referencePrice.trim() === "" ? null : Number(referencePrice),
        searchTerm: searchTerm.trim() === "" ? null : searchTerm.trim(),
        countedElsewhere,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Editar ítem del plan" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Descripción">
          <textarea
            autoFocus
            className={`${inputClass} min-h-20 resize-y`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </Field>
        <Field label="Precio de referencia (€)">
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={referencePrice}
            onChange={(e) => setReferencePrice(e.target.value)}
            placeholder="Sin precio de referencia"
          />
        </Field>
        <Field label="Término de búsqueda (opcional)">
          <input
            type="text"
            className={inputClass}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Lo que se copiará para pegar en la tienda"
          />
        </Field>
        <label className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
          <input
            type="checkbox"
            checked={countedElsewhere}
            onChange={(e) => setCountedElsewhere(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-[var(--status-good)]"
          />
          <span>
            Ya está registrado con su precio real en Colección o Sellado
            <span className="block text-xs text-[var(--text-muted)]">
              Marca esto si ya diste de alta esta compra en otra pantalla — evita sumar su precio de referencia dos
              veces en "Invertido".
            </span>
          </span>
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Modal>
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
  const [copied, setCopied] = useState(false);
  // Si el ítem tiene un término de búsqueda propio se copia solo eso, listo para pegar en
  // el buscador de la tienda — copiar la descripción completa (con cantidad, precio de
  // referencia, etc.) obligaría a limpiarla a mano antes de buscar.
  const copyText = item.searchTerm ?? item.description;

  async function handleCopy() {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(copyText);
    } else {
      // navigator.clipboard no existe fuera de un contexto seguro (https, o localhost) —
      // p. ej. al entrar por la IP de la red local o Tailscale desde el móvil, en http://.
      // Fallback clásico con un <textarea> oculto + execCommand, que sí funciona ahí.
      const textarea = document.createElement("textarea");
      textarea.value = copyText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
      <span className="flex-1 py-1 text-left text-sm leading-snug break-words whitespace-normal">
        <ItemDescription item={item} />
      </span>
      <IconButton className="mt-1" onClick={() => setEditing(true)} label={`Editar "${item.description}"`}>
        <PencilIcon className="size-4" />
      </IconButton>
      <IconButton className="mt-1" onClick={handleCopy} label={`Copiar "${copyText}"`}>
        {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      </IconButton>
      <IconButton className="mt-1" tone="danger" onClick={handleRemove} label={`Quitar ${item.description} del plan`}>
        ×
      </IconButton>
      {editing && (
        <PlanItemEditForm
          item={item}
          onSubmit={(entity) => onUpdate(item.id, entity)}
          onClose={() => setEditing(false)}
        />
      )}
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
        <SectionLabel className="px-2 pb-1">{PLAN_CATEGORY_LABELS[category]}</SectionLabel>
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
  const allDone = estimate.totalCount > 0 && estimate.doneCount === estimate.totalCount;
  // Un mes ya completado arranca cerrado (menos ruido visual), pero sigue siendo un mes
  // más entre los demás mientras se está trabajando en él — no se cierra solo mientras lo
  // estás viendo, solo al volver a cargar la pantalla. El estado del toggle nativo del
  // usuario se refleja de vuelta aquí vía onToggle, así queda como un <details> normal.
  const [open, setOpen] = useState(() => !allDone);

  return (
    <details
      className="group flex flex-col gap-3"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-x-4 gap-y-1 [&::-webkit-details-marker]:hidden">
        <h2 className="flex items-center gap-1.5 font-[family-name:var(--font-display)] text-sm font-bold tracking-wide text-[var(--text-secondary)] uppercase">
          <span aria-hidden="true" className="inline-block transition-transform group-open:rotate-90">
            ›
          </span>
          {monthLabel(month)}
          {allDone && <span title="Mes completado">✓</span>}
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
            <span title="Suma el precio de referencia de los ítems de 'Comprar' que lo tienen puesto — no incluye 'Guardar sellado', ya que no es un gasto nuevo.">
              Total{" "}
              <span className="font-bold" style={{ color: overBudget ? "var(--status-critical)" : "var(--status-good)" }}>
                {formatMoney(estimate.amount)}
              </span>
              {monthlyBudget !== null && <> / {formatMoney(monthlyBudget)}</>}
            </span>
          )}
        </div>
      </summary>

      <div className="mt-3 flex flex-col gap-3">
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
                <SectionLabel className="px-2">{PLAN_CATEGORY_LABELS[category]}</SectionLabel>
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
    </details>
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
    await onAdd({ month, category, description, referencePrice: null, searchTerm: null, done: false, position, countedElsewhere: false });
  }

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Plan" subtitle="Tu objetivo de compra mes a mes." />

      {settings && <ShoppingLinksCard settings={settings} onUpdateSettings={onUpdateSettings} />}

      {settings && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <SectionLabel>Presupuesto mensual</SectionLabel>
              <p className="mt-1 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--amber)]">
                {formatMoney(settings.monthlyBudget)}
              </p>
            </div>
            <Button variant="tint" size="sm" onClick={() => setShowSettings(true)} className="shrink-0">
              Ajustes del plan
            </Button>
          </div>
          {(settings.yearRules || settings.yearGoal) && (
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-1.5 [&::-webkit-details-marker]:hidden">
                <span aria-hidden="true" className="inline-block text-[var(--text-muted)] transition-transform group-open:rotate-90">
                  ›
                </span>
                <SectionLabel>Reglas y objetivo del año</SectionLabel>
              </summary>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                {settings.yearRules && (
                  <div className="min-w-0 flex-1">
                    <SectionLabel>Reglas del año</SectionLabel>
                    <p className="text-sm whitespace-pre-line text-[var(--text-secondary)]">{settings.yearRules}</p>
                  </div>
                )}
                {settings.yearGoal && (
                  <div className="min-w-0 flex-1">
                    <SectionLabel>Objetivo al terminar</SectionLabel>
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
        // Gap propio, más ajustado que el gap-6 del resto de secciones de la pantalla: los
        // meses son entradas de una misma lista (mismo criterio que cualquier acordeón),
        // no bloques independientes, así que no necesitan tanto aire entre ellos — el
        // separador visual real es el borde que pone divide-y, no el espacio en blanco.
        <div className="flex flex-col gap-3 divide-y divide-[var(--gridline)] [&>*:not(:first-child)]:pt-3">
          {groups.map((group) => (
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
          ))}
        </div>
      )}
    </div>
  );
}
