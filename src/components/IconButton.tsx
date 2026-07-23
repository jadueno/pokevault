import type { ButtonHTMLAttributes, ReactNode } from "react";
import { focusRing } from "./Field";

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "type"> {
  children: ReactNode;
  label: string;
  /** "danger" tiñe el hover de rojo crítico (quitar/eliminar) en vez del rojo de marca,
   * mismo criterio que el resto de acciones destructivas de la app. */
  tone?: "default" | "danger";
  /** Para usarlo sobre un fondo de color saturado (p. ej. la tarjeta "sticker" de un set):
   * texto y hover en blanco en vez de los tokens pensados para fondo claro. */
  onDark?: boolean;
  className?: string;
}

/** Botón de acción secundaria de un solo icono/emoji (editar, quitar, copiar, refrescar…),
 * repetido en varias pantallas (Plan, Sets…) — un único componente para que todos
 * compartan tamaño, forma y comportamiento de hover en vez de que cada sitio reinvente
 * el suyo con su propia combinación de padding/radio/color. */
export function IconButton({ children, label, tone = "default", onDark = false, className = "", ...rest }: IconButtonProps) {
  const colorClass = onDark
    ? "text-white/80 hover:bg-white/15 hover:text-white"
    : tone === "danger"
      ? "text-[var(--text-muted)] hover:bg-[var(--gridline)] hover:text-[var(--status-critical)]"
      : "text-[var(--text-muted)] hover:bg-[var(--gridline)] hover:text-[var(--beacon)]";
  return (
    <button
      type="button"
      aria-label={label}
      className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${colorClass} ${focusRing} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
