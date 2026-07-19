import type { ReactNode } from "react";

/** Anillo de foco consistente para toda la app. */
export const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--beacon)]";

/** Estilo compartido para inputs, selects y textareas de los formularios. */
export const inputClass = `w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors focus-visible:border-[var(--beacon)] ${focusRing}`;

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    // min-w-0: sin esto, un <input type="date"> (o cualquier contenido con ancho
    // intrínseco propio) impide que su celda del grid se encoja por debajo de ese ancho,
    // aunque el input tenga w-full — el grid entero se ensancha y genera scroll
    // horizontal. Mismo gotcha que ya se documentó en Card.tsx, aplicado aquí también.
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}
