import { useState } from "react";
import type { NewPlanItem, PlanCategory, PlanItem, PlanSettings } from "../../domain/types";
import { PLAN_CATEGORIES, PLAN_CATEGORY_LABELS, formatMoney, groupPlanByMonth, monthLabel } from "../../domain/calculations";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { inputClass } from "../../components/Field";
import { PlanSettingsForm } from "./PlanSettingsForm";

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

  function stripId(item: PlanItem): NewPlanItem {
    const { id: _id, ...rest } = item;
    return rest;
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
    <li className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-[var(--gridline)]">
      <input
        type="checkbox"
        checked={item.done}
        onChange={() => onToggleDone(item.id)}
        aria-label={`Marcar "${item.description}" como hecho`}
        className="size-4 shrink-0 accent-[var(--beacon)]"
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
          className={`flex-1 truncate text-left text-sm ${
            item.done ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"
          }`}
        >
          {item.description}
        </button>
      )}
      <button
        type="button"
        onClick={handleRemove}
        aria-label={`Quitar ${item.description} del plan`}
        className="shrink-0 rounded-lg px-1.5 py-0.5 text-xs text-[var(--text-muted)] transition-colors hover:text-[var(--status-critical)]"
      >
        ×
      </button>
    </li>
  );
}

function AddPlanItemRow({ onAdd }: { onAdd: (description: string) => Promise<void> }) {
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
      <div className="flex flex-wrap items-start justify-between gap-3 py-4 sm:py-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">Plan</h1>
          <p className="text-base font-normal text-[var(--text-secondary)]">
            Tu objetivo de compra mes a mes. "Hecho" es solo una casilla de seguimiento: no registra la compra en tu
            colección ni cuenta en el valor total — para eso, usa "Ya la tengo" desde Buscar o Wishlist.
          </p>
        </div>
        <Button variant="tint" onClick={() => setShowSettings(true)}>
          Ajustes del plan
        </Button>
      </div>

      {settings && (
        <Card className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <div>
            <p className="text-xs text-[var(--text-muted)]">Presupuesto mensual</p>
            <p className="text-lg font-bold text-[var(--beacon)]">{formatMoney(settings.monthlyBudget)}</p>
          </div>
          {settings.yearRules && (
            <div className="min-w-0 flex-1 basis-64">
              <p className="text-xs text-[var(--text-muted)]">Reglas del año</p>
              <p className="text-sm whitespace-pre-line text-[var(--text-secondary)]">{settings.yearRules}</p>
            </div>
          )}
          {settings.yearGoal && (
            <div className="min-w-0 flex-1 basis-64">
              <p className="text-xs text-[var(--text-muted)]">Objetivo al terminar</p>
              <p className="text-sm whitespace-pre-line text-[var(--text-secondary)]">{settings.yearGoal}</p>
            </div>
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
          <p className="text-sm text-[var(--text-muted)]">Todavía no hay ítems en el plan.</p>
        </Card>
      ) : (
        groups.map((group) => (
          <div key={group.month} className="flex flex-col gap-3">
            <h2 className="text-sm font-bold tracking-wide text-[var(--text-secondary)] uppercase">
              {monthLabel(group.month)}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {PLAN_CATEGORIES.map((category) => (
                <Card key={category} className="flex flex-col gap-1.5 p-3 sm:p-4">
                  <p className="px-2 text-xs font-bold tracking-wide text-[var(--text-muted)] uppercase">
                    {PLAN_CATEGORY_LABELS[category]}
                  </p>
                  {group.byCategory[category].length > 0 && (
                    <ul className="flex flex-col">
                      {group.byCategory[category].map((item) => (
                        <PlanItemRow
                          key={item.id}
                          item={item}
                          onToggleDone={onToggleDone}
                          onUpdate={onUpdate}
                          onRemove={onRemove}
                        />
                      ))}
                    </ul>
                  )}
                  <AddPlanItemRow onAdd={(description) => handleAdd(group.month, category, description)} />
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
