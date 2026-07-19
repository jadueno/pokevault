import type { ReactNode } from "react";
import { focusRing } from "./Field";
import { useScrollLock } from "./useScrollLock";

const SIZE_CLASSES = { md: "max-w-2xl", lg: "max-w-6xl" };

/** Cascarón de modal compartido: overlay, tarjeta centrada, cabecera con título/descripción
 * opcional y botón de cerrar, contenido con scroll propio. `size="lg"` para contenido
 * denso (p. ej. el Plan, con su rejilla de 3 columnas por mes) que no cabe en el ancho
 * compacto pensado para formularios. */
export function Modal({
  title,
  description,
  size = "md",
  onClose,
  children,
}: {
  title: string;
  description?: ReactNode;
  size?: "md" | "lg";
  onClose: () => void;
  children: ReactNode;
}) {
  useScrollLock();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 p-4 backdrop-blur-sm"
      style={{ overscrollBehavior: "contain" }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className={`flex max-h-[85vh] w-full ${SIZE_CLASSES[size]} flex-col overflow-hidden rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-1)] shadow-float`}>
        <div
          aria-hidden="true"
          className="h-1.5 shrink-0"
          style={{ background: "var(--hero-gradient)" }}
        />
        <div className="flex items-start justify-between border-b border-[var(--gridline)] p-5">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-bold text-[var(--text-primary)]">{title}</h2>
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
        {/* overflow-x-hidden explícito: dejar overflow-y en "auto" sin fijar overflow-x
            hace que el navegador trate también el eje X como "auto" (regla del spec de
            CSS Overflow), así que cualquier contenido interno con ancho intrínseco propio
            (p. ej. un <input type="date">) podía generar scroll horizontal aquí. */}
        <div className="flex-1 overflow-x-hidden overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
