import type { ReactNode } from "react";

/** Silueta de Poké Ball (círculo + banda central + botón) puramente de trazo, mismo
 * lenguaje visual que el resto de iconos de la app — motivo decorativo de marca en vez
 * del arco+línea abstracto anterior, que no se leía como nada concreto. */
function PokeballWatermark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 100 100"
      className="pointer-events-none absolute -top-8 -right-8 size-36 text-white/15 sm:-top-10 sm:-right-10 sm:size-52"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="6" />
      <line x1="4" y1="50" x2="96" y2="50" stroke="currentColor" strokeWidth="6" />
      <circle cx="50" cy="50" r="13" fill="none" stroke="currentColor" strokeWidth="6" />
    </svg>
  );
}

/** Cabecera "hero" con degradado vivo, compartida por las pantallas de nivel superior
 * (Resumen, Mi colección, Wishlist, Plan). Traslada la energía del banner de la
 * referencia (degradado saturado, título muy bold, silueta de Poké Ball decorativa) sin
 * depender de una imagen de un ítem concreto — aquí no hay un "protagonista" fijo como el
 * Pokémon de portada, así que el propio degradado + tipografía hacen el trabajo.
 *
 * Margen superior negativo en móvil que cancela exactamente el padding-top que <main> le
 * suma a toda pantalla (env(safe-area-inset-top)+1rem): es siempre el primer elemento de
 * cada pantalla, así que queda pegada al borde real de arriba y su degradado llega hasta
 * detrás de la barra de estado — el padding-top interno (con el mismo env()) es lo que
 * aparta el título de la hora/batería, sin dejar un hueco de --page plano por encima de
 * la cabecera. En sm+ no cancela nada (sm:mt-0): ahí no hay barra de estado que cubrir,
 * así que se queda el hueco normal que ya pone <main>. */
export function ScreenHeader({ title, subtitle, action }: { title: string; subtitle: ReactNode; action?: ReactNode }) {
  return (
    <div
      className="relative -mt-[calc(env(safe-area-inset-top)+1rem)] overflow-hidden rounded-[2rem] px-5 pt-[calc(env(safe-area-inset-top)+1.5rem)] pb-6 sm:mt-0 sm:px-8 sm:pt-8 sm:pb-8"
      style={{ background: "var(--hero-gradient)" }}
    >
      <PokeballWatermark />
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
