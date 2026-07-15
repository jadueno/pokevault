import type { CSSProperties, ReactNode } from "react";

export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      // min-w-0: sin esto, un hijo con contenido que no puede partirse en líneas (p. ej.
      // una URL larga con "truncate") impide que la tarjeta se encoja por debajo de ese
      // contenido, aunque sea un elemento de grid/flex — la desborda hacia los lados.
      className={`min-w-0 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-1)] p-5 shadow-card transition-shadow duration-200 sm:p-6 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
