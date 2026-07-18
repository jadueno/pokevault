import { useState } from "react";
import { useCollectionData } from "./data/useCollectionData";
import { useWishlistData } from "./data/useWishlistData";
import { useSealedData } from "./data/useSealedData";
import { usePlanData } from "./data/usePlanData";
import { AnadirScreen } from "./features/anadir/AnadirScreen";
import { ColeccionScreen } from "./features/coleccion/ColeccionScreen";
import { WishlistScreen } from "./features/wishlist/WishlistScreen";
import { DashboardScreen } from "./features/dashboard/DashboardScreen";
import { PlanScreen } from "./features/plan/PlanScreen";
import { LoadingState } from "./components/LoadingState";

type Section = "dashboard" | "anadir" | "coleccion" | "wishlist" | "plan";

// "anadir" no aparece aquí a propósito: se accede desde el botón flotante de Mi
// colección, no ocupa un hueco fijo en el menú.
// "Sellado" ya no es una sección aparte: se fusionó dentro de "Mi colección" (para el
// usuario, la colección es todo, tanto cartas como cajas).
const sections: { id: Section; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "coleccion", label: "Mi colección" },
  { id: "wishlist", label: "Wishlist" },
  { id: "dashboard", label: "Resumen" },
];

export default function App() {
  const [section, setSection] = useState<Section>("plan");
  const collection = useCollectionData();
  const wishlist = useWishlistData();
  const sealed = useSealedData();
  const plan = usePlanData();

  const loading = collection.loading && !collection.summary;
  const error = collection.error ?? wishlist.error ?? sealed.error ?? plan.error;

  return (
    <div className="app-shell flex min-h-screen flex-col sm:flex-row">
      <nav
        aria-label="Secciones de la app"
        className="hidden shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--surface-1)] p-4 sm:sticky sm:top-0 sm:flex sm:h-screen sm:w-56"
      >
        <div className="mb-4 flex items-center gap-2.5 px-2">
          <span
            aria-hidden="true"
            className="flex size-8 items-center justify-center rounded-full text-base"
            style={{ background: "var(--hero-gradient)" }}
          >
            🎴
          </span>
          <p className="font-[family-name:var(--font-display)] text-base leading-tight font-bold text-[var(--text-primary)]">
            PokéVault
          </p>
        </div>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            aria-current={section === s.id ? "page" : undefined}
            // Navegación = "dónde estoy", no una acción: se marca con un tinte de marca,
            // no con el mismo rojo sólido que el FAB y los botones de guardar/enviar,
            // para que estos últimos sigan destacando como la acción principal de verdad.
            className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-left text-sm font-bold whitespace-nowrap transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--beacon)] ${
              section === s.id ? "text-[var(--beacon)]" : "text-[var(--text-secondary)] hover:bg-[var(--gridline)]"
            }`}
            style={section === s.id ? { backgroundColor: "color-mix(in srgb, var(--beacon) 16%, transparent)" } : undefined}
          >
            {s.label}
          </button>
        ))}
      </nav>

      <main className="relative flex-1 p-4 pb-28 sm:p-8 sm:pb-12">
        <div className="mx-auto max-w-6xl">
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-[1.75rem] border p-4 text-sm shadow-card"
              style={{
                borderColor: "var(--status-critical)",
                color: "var(--status-critical)",
                backgroundColor: "color-mix(in srgb, var(--status-critical) 8%, var(--surface-1))",
              }}
            >
              No se ha podido conectar con el backend ({error}). ¿Está corriendo <code>npm run dev</code> dentro de{" "}
              <code>backend/</code>?
            </div>
          )}
          {loading && !error && <LoadingState />}
          {!loading && (
            <>
              {section === "dashboard" && <DashboardScreen summary={collection.summary} sealedItems={sealed.items} />}
              {section === "anadir" && (
                <AnadirScreen
                  onAddToCollection={collection.addItem}
                  onAddToWishlist={wishlist.addItem}
                  onAddToSealed={sealed.addItem}
                />
              )}
              {section === "coleccion" && (
                <>
                  <ColeccionScreen
                    items={collection.items}
                    onRemove={collection.removeItem}
                    onOverrideValue={collection.overrideValue}
                    sealedItems={sealed.items}
                    onAddSealed={sealed.addItem}
                    onUpdateSealed={sealed.updateItem}
                    onRemoveSealed={sealed.removeItem}
                    onOverrideSealedValue={sealed.overrideValue}
                  />
                  <button
                    type="button"
                    onClick={() => setSection("anadir")}
                    aria-label="Añadir carta o caja"
                    className="fixed right-4 bottom-24 z-20 flex size-14 items-center justify-center rounded-full text-2xl font-bold text-[var(--on-hero)] shadow-float transition-transform hover:scale-105 active:scale-95 sm:right-8 sm:bottom-8"
                    style={{ background: "var(--hero-gradient)" }}
                  >
                    +
                  </button>
                </>
              )}
              {section === "wishlist" && (
                <WishlistScreen
                  items={wishlist.items}
                  onAdd={wishlist.addItem}
                  onUpdate={wishlist.updateItem}
                  onRemove={wishlist.removeItem}
                  onMoveToCollection={async (id, details) => {
                    await wishlist.moveToCollection(id, details);
                    await collection.reload();
                  }}
                />
              )}
              {section === "plan" && (
                <PlanScreen
                  items={plan.items}
                  settings={plan.settings}
                  onAdd={plan.addItem}
                  onUpdate={plan.updateItem}
                  onRemove={plan.removeItem}
                  onToggleDone={plan.toggleDone}
                  onUpdateSettings={plan.updateSettings}
                />
              )}
            </>
          )}
        </div>
      </main>

      <nav
        aria-label="Secciones de la app"
        className="fixed inset-x-0 bottom-0 z-10 pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <div className="mx-2 mb-3 flex justify-around rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-1)]/90 px-0.5 py-1.5 shadow-float backdrop-blur-md">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              aria-current={section === s.id ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-full px-0.5 py-1.5 text-xs font-bold whitespace-nowrap transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--beacon)] ${
                section === s.id ? "text-[var(--beacon)]" : "text-[var(--text-muted)]"
              }`}
              style={section === s.id ? { backgroundColor: "color-mix(in srgb, var(--beacon) 16%, transparent)" } : undefined}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
