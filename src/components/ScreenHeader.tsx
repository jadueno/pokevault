import type { ReactNode } from "react";

/** Cabecera "hero" con degradado vivo, compartida por las pantallas de nivel superior
 * (Resumen, Mi colección, Wishlist, Añadir). Traslada la energía del banner de la
 * referencia (degradado saturado, título muy bold, silueta circular decorativa tipo
 * Poké Ball) sin depender de una imagen de un ítem concreto — aquí no hay un "protagonista"
 * fijo como el Pokémon de portada, así que el propio degradado + tipografía hacen el trabajo. */
export function ScreenHeader({ title, subtitle, action }: { title: string; subtitle: ReactNode; action?: ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-[2rem] px-5 py-6 sm:px-8 sm:py-8"
      style={{ background: "var(--hero-gradient)" }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full border-[10px] border-white/10 sm:size-56"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 -right-3 h-[2px] w-24 -translate-y-1/2 bg-white/10 sm:w-36"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold tracking-tight text-[var(--on-hero)] sm:text-4xl">
            {title}
          </h1>
          <p className="mt-1 max-w-md text-sm text-white/80 sm:text-base">{subtitle}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
