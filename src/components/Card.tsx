import type { CSSProperties, ReactNode } from "react";

export function Card({
  children,
  className = "",
  style,
  variant = "flat",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** "flat": tarjeta de contenido/utilidad (formularios, estados vacíos, estadísticas) —
   * fondo plano, sin protagonismo. "gradient": tarjeta "protagonista" que representa un
   * ítem (carta, producto sellado, deseo) — fondo degradado oscuro con acento de marca y
   * brillo al pasar el ratón, el lenguaje visual de la referencia aplicado solo donde
   * hay una foto/objeto real que destacar. */
  variant?: "flat" | "gradient";
}) {
  const variantClass =
    variant === "gradient"
      ? "border-[var(--border)] shadow-card transition-all duration-200 hover:shadow-glow hover:-translate-y-0.5"
      : "border-[var(--border)] bg-[var(--surface-1)] shadow-card transition-shadow duration-200";
  return (
    <div
      // min-w-0: sin esto, un hijo con contenido que no puede partirse en líneas (p. ej.
      // una URL larga con "truncate") impide que la tarjeta se encoja por debajo de ese
      // contenido, aunque sea un elemento de grid/flex — la desborda hacia los lados.
      className={`min-w-0 rounded-[1.75rem] border p-5 sm:p-6 ${variantClass} ${className}`}
      style={variant === "gradient" ? { background: "var(--card-gradient)", ...style } : style}
    >
      {children}
    </div>
  );
}
