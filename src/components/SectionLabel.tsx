import type { ReactNode } from "react";

/** Título de una subsección dentro de una tarjeta (p. ej. "Páginas donde comprar", el
 * nombre de una categoría del Plan, las cifras del Resumen): un único estilo compartido
 * en vez de que cada pantalla reinvente el suyo con clases sueltas — etiqueta pequeña, en
 * mayúsculas, en el color muted de la app. */
export function SectionLabel({
  children,
  className = "",
  onDark = false,
}: {
  children: ReactNode;
  className?: string;
  /** Para usarlo sobre un fondo de color saturado (p. ej. la tarjeta hero del Resumen). */
  onDark?: boolean;
}) {
  return (
    <p className={`text-xs font-bold tracking-wide uppercase ${onDark ? "text-white/70" : "text-[var(--text-muted)]"} ${className}`}>
      {children}
    </p>
  );
}
