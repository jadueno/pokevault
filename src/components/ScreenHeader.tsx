import type { ReactNode } from "react";

/** Cabecera de cada pantalla de nivel superior (Resumen, Mi colección, Wishlist, Plan):
 * sin tarjeta de fondo, la energía de marca viene solo de la tipografía (titular grande,
 * muy bold, en el rojo de marca) en vez de un bloque de color — un fondo sólido o
 * degradado aquí generaba costuras visibles con la tira de estado de Safari que no se
 * pueden igualar del todo con un color plano (ver historial de commits sobre la franja
 * superior en iOS).
 *
 * <main> no le pone padding-top propio (ver App.tsx): en móvil, ScreenHeader es siempre
 * el primer elemento de cada pantalla, así que el padding-top interno (con
 * env(safe-area-inset-top)) es lo que aparta el título de la hora/batería. En sm+ lleva
 * su propio mt-8 (ahí no hay barra de estado que cubrir).
 *
 * Sin padding-bottom propio: el hueco hasta la siguiente caja de contenido lo pone
 * siempre el `gap-6` del contenedor de cada pantalla, nunca los dos a la vez — antes se
 * sumaban (este padding + el gap del contenedor) y quedaba un espacio excesivo, distinto
 * según la pantalla porque no había un único sitio donde ese hueco estuviera definido. */
export function ScreenHeader({ title, subtitle, action }: { title: string; subtitle: ReactNode; action?: ReactNode }) {
  return (
    <div className="pt-[calc(env(safe-area-inset-top)+1.5rem)] sm:mt-8 sm:pt-0">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-extrabold tracking-tight text-[var(--beacon)] sm:text-6xl">
            {title}
          </h1>
          <p className="mt-2 max-w-md text-base text-[var(--text-secondary)] sm:text-lg">{subtitle}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}
