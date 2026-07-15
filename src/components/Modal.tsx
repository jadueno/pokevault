import type { ReactNode } from "react";
import { focusRing } from "./Field";

/** Cascarón de modal compartido: overlay, tarjeta centrada, cabecera con título/descripción
 * opcional y botón de cerrar, contenido con scroll propio. */
export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 p-4 backdrop-blur-sm"
      style={{ overscrollBehavior: "contain" }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-1)] shadow-float">
        <div className="flex items-start justify-between border-b border-[var(--gridline)] p-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
            {description && <p className="text-xs text-[var(--text-muted)]">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--gridline)] ${focusRing}`}
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
