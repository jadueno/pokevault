import type { ReactNode } from "react";

export type BadgeTone = "beacon" | "amber" | "good" | "warning" | "critical" | "info" | "neutral";

/** Exportado para los pocos sitios que necesitan el color de un tono de insignia sobre un
 * control nativo (p. ej. un `<select>` "disfrazado" de insignia editable) en vez de sobre
 * el propio `<Badge>`. */
export const badgeToneColors: Record<BadgeTone, { bg: string; fg: string }> = {
  beacon: { bg: "var(--beacon)", fg: "var(--on-beacon)" },
  amber: { bg: "var(--amber)", fg: "var(--on-amber)" },
  good: { bg: "var(--status-good)", fg: "var(--on-status-good)" },
  warning: { bg: "var(--status-warning)", fg: "var(--on-status-warning)" },
  critical: { bg: "var(--status-critical)", fg: "var(--on-status-critical)" },
  info: { bg: "var(--status-info)", fg: "var(--on-status-info)" },
  neutral: { bg: "var(--status-neutral)", fg: "var(--on-status-neutral)" },
};

/** Insignia de color sólido para metadatos cortos (idioma, estado de conservación,
 * prioridad, tipo de producto, confianza del reconocimiento…) — el lenguaje visual de
 * "chip de color" de la referencia, aplicado a los datos que ya mostraba la app. */
export function Badge({ tone = "neutral", children, className = "" }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  const colors = badgeToneColors[tone];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${className}`}
      style={{ backgroundColor: colors.bg, color: colors.fg }}
    >
      {children}
    </span>
  );
}
