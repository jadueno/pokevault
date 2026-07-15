import { useState } from "react";
import type { PlanSettings } from "../../domain/types";
import { Button } from "../../components/Button";
import { Field, inputClass } from "../../components/Field";
import { Modal } from "../../components/Modal";

export function PlanSettingsForm({
  settings,
  onSubmit,
  onCancel,
}: {
  settings: PlanSettings;
  onSubmit: (entity: PlanSettings) => Promise<void>;
  onCancel: () => void;
}) {
  const [monthlyBudget, setMonthlyBudget] = useState(settings.monthlyBudget !== null ? String(settings.monthlyBudget) : "");
  const [yearRules, setYearRules] = useState(settings.yearRules ?? "");
  const [yearGoal, setYearGoal] = useState(settings.yearGoal ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        monthlyBudget: monthlyBudget ? Number(monthlyBudget) : null,
        yearRules: yearRules || null,
        yearGoal: yearGoal || null,
        // Las páginas de compra se editan directamente en la pantalla del plan, no aquí.
        shoppingLinks: settings.shoppingLinks,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Ajustes del plan" description="Presupuesto mensual y notas generales, válidas para todo el año." onClose={onCancel}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Presupuesto mensual (€)">
          <input
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
          />
        </Field>
        <Field label="Reglas para todo el año">
          <textarea rows={8} className={inputClass} value={yearRules} onChange={(e) => setYearRules(e.target.value)} />
        </Field>
        <Field label="Objetivo al terminar el plan">
          <textarea rows={6} className={inputClass} value={yearGoal} onChange={(e) => setYearGoal(e.target.value)} />
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
