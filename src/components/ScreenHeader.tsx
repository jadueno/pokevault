import type { ReactNode } from "react";

/** Destellos tipo "shine" holográfico (el brillo de una carta con lámina especial), en
 * vez de una silueta figurativa (círculo+banda tipo Poké Ball: comprobado renderizando
 * ambas versiones con Playwright — la silueta quedaba cortada de forma rara por el
 * overflow-hidden de la cabecera y no se leía como nada reconocible). Colocado con un
 * margen fijo desde la esquina en vez de desbordar el borde de la tarjeta, para que
 * nunca quede recortado a medias. */
function ShineWatermark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className="pointer-events-none absolute top-4 right-4 size-24 sm:top-6 sm:right-6 sm:size-32"
    >
      <path d="M74 12 l4 9 l9 4 l-9 4 l-4 9 l-4 -9 l-9 -4 l9 -4 Z" fill="white" opacity="0.28" />
      <path d="M88 34 l2.5 5.5 l5.5 2.5 l-5.5 2.5 l-2.5 5.5 l-2.5 -5.5 l-5.5 -2.5 l5.5 -2.5 Z" fill="white" opacity="0.22" />
      <path d="M58 6 l2 4.5 l4.5 2 l-4.5 2 l-2 4.5 l-2 -4.5 l-4.5 -2 l4.5 -2 Z" fill="white" opacity="0.18" />
    </svg>
  );
}

/** Cabecera "hero" con degradado vivo, compartida por las pantallas de nivel superior
 * (Resumen, Mi colección, Wishlist, Plan). Traslada la energía del banner de la
 * referencia (degradado saturado, título muy bold, destello holográfico decorativo) sin
 * depender de una imagen de un ítem concreto — aquí no hay un "protagonista" fijo como el
 * Pokémon de portada, así que el propio degradado + tipografía hacen el trabajo.
 *
 * <main> no le pone padding-top propio (ver App.tsx): en móvil, ScreenHeader es siempre
 * el primer elemento de cada pantalla, así que queda pegada de forma natural al borde
 * real de arriba y su degradado llega hasta detrás de la barra de estado — el
 * padding-top interno (con env(safe-area-inset-top)) es lo que aparta el título de la
 * hora/batería, sin dejar ningún hueco de --page plano por encima de la cabecera. En
 * sm+ sí lleva su propio mt-8 (ahí no hay barra de estado que cubrir). */
export function ScreenHeader({ title, subtitle, action }: { title: string; subtitle: ReactNode; action?: ReactNode }) {
  return (
    <div
      className="relative overflow-hidden rounded-[2rem] px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-6 sm:mt-8 sm:px-8 sm:pt-8 sm:pb-8"
      style={{ background: "var(--hero-gradient)" }}
    >
      <ShineWatermark />
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
