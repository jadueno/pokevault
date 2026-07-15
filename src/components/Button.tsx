import type { ButtonHTMLAttributes } from "react";
import { focusRing } from "./Field";

export type ButtonTone = "ink" | "beacon" | "amber" | "critical" | "neutral";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** "ink" es el tono por defecto para la acción principal. Los tonos de color (beacon/amber)
   * se reservan para acciones que se benefician de distinguirse. */
  tone?: ButtonTone;
  /** "solid": acción principal o confirmación destructiva. "tint": acción secundaria con
   * fondo muy suave del color del tono. "ghost": terciario, sin fondo ni color de marca. */
  variant?: "solid" | "tint" | "ghost";
  size?: "sm" | "md";
}

const toneVars: Record<Exclude<ButtonTone, "neutral">, { bg: string; fg: string }> = {
  ink: { bg: "var(--ink)", fg: "var(--on-ink)" },
  beacon: { bg: "var(--beacon)", fg: "var(--on-beacon)" },
  amber: { bg: "var(--amber)", fg: "var(--on-amber)" },
  critical: { bg: "var(--status-critical)", fg: "var(--on-status-critical)" },
};

export function Button({
  tone = "ink",
  variant = "solid",
  size = "md",
  className = "",
  style,
  disabled,
  children,
  ...rest
}: ButtonProps) {
  const sizeClass = size === "sm" ? "px-3.5 py-1.5 text-sm" : "px-4 py-2.5 text-sm";
  const base = `inline-flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${focusRing}`;

  if (variant === "ghost") {
    return (
      <button
        type="button"
        disabled={disabled}
        className={`${base} ${sizeClass} text-[var(--text-secondary)] hover:bg-[var(--gridline)] active:scale-[0.98] ${className}`}
        style={style}
        {...rest}
      >
        {children}
      </button>
    );
  }

  const colors = tone === "neutral" ? { bg: "var(--text-secondary)", fg: "var(--surface-1)" } : toneVars[tone];

  if (variant === "tint") {
    return (
      <button
        type="button"
        disabled={disabled}
        className={`${base} ${sizeClass} border hover:brightness-95 active:scale-[0.98] ${className}`}
        style={{
          backgroundColor: `color-mix(in srgb, ${colors.bg} 14%, var(--surface-1))`,
          borderColor: `color-mix(in srgb, ${colors.bg} 30%, transparent)`,
          color: colors.bg,
          ...style,
        }}
        {...rest}
      >
        {children}
      </button>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      className={`${base} ${sizeClass} shadow-card hover:shadow-card-hover hover:brightness-110 active:scale-[0.98] ${className}`}
      style={{ backgroundColor: colors.bg, color: colors.fg, ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}
