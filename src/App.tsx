import { useState, type ReactElement } from "react";
import { useCollectionData } from "./data/useCollectionData";
import { useWishlistData } from "./data/useWishlistData";
import { useSealedData } from "./data/useSealedData";
import { usePlanData } from "./data/usePlanData";
import { useSetChecklistData } from "./data/useSetChecklistData";
import { ColeccionScreen } from "./features/coleccion/ColeccionScreen";
import { WishlistScreen } from "./features/wishlist/WishlistScreen";
import { DashboardScreen } from "./features/dashboard/DashboardScreen";
import { PlanScreen } from "./features/plan/PlanScreen";
import { LoadingState } from "./components/LoadingState";

type Section = "dashboard" | "coleccion" | "wishlist" | "plan";

// Iconos de trazo simple (mismo lenguaje visual que Instagram: líneas finas, sin relleno,
// heredan el color del texto vía currentColor) en vez de emoji — el menú se distingue por
// icono en vez de por etiqueta, así que cada uno lleva su propio aria-label en el botón.
function ColeccionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" />
      <rect x="2" y="8" width="14" height="14" rx="3" />
    </svg>
  );
}

function PlanIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="3" width="16" height="18" rx="3" />
      <path d="M8 8h8M8 12.5h4" />
      <path d="m8 16.5 1.8 1.8L13 15" />
    </svg>
  );
}

function WishlistIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

function ResumenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="12" width="4.5" height="8" rx="1" />
      <rect x="9.75" y="7" width="4.5" height="13" rx="1" />
      <rect x="16.5" y="3" width="4.5" height="17" rx="1" />
    </svg>
  );
}

// "Sellado" ya no es una sección aparte: se fusionó dentro de "Mi colección" (para el
// usuario, la colección es todo, tanto cartas como cajas). Tampoco hay una sección
// "Añadir": cada destino (cartas, wishlist, sellado) tiene su propio botón "+" directo.
const sections: { id: Section; label: string; Icon: (props: { className?: string }) => ReactElement }[] = [
  { id: "coleccion", label: "Mi colección", Icon: ColeccionIcon },
  { id: "plan", label: "Plan", Icon: PlanIcon },
  { id: "wishlist", label: "Wishlist", Icon: WishlistIcon },
  { id: "dashboard", label: "Resumen", Icon: ResumenIcon },
];

export default function App() {
  const [section, setSection] = useState<Section>("coleccion");
  const collection = useCollectionData();
  const wishlist = useWishlistData();
  const sealed = useSealedData();
  const plan = usePlanData();
  const setChecklists = useSetChecklistData();

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
            style={section === s.id ? { backgroundColor: "color-mix(in srgb, var(--beacon) 14%, transparent)" } : undefined}
          >
            <s.Icon className="size-5 shrink-0" />
            {s.label}
          </button>
        ))}
      </nav>

      {/* pt- explícito en vez de heredar del p-4/sm:p-8 general: con viewport-fit=cover
          (index.html) el contenido se extiende debajo de la barra de estado/notch, así
          que hace falta sumar env(safe-area-inset-top) al hueco de siempre (protege el
          texto de error/skeleton de carga). ScreenHeader —siempre el primer elemento de
          cada pantalla— cancela este padding con un margen negativo propio para quedar
          pegado al borde real de arriba y que su degradado llegue hasta detrás de la
          barra de estado, sin dejar una franja de --page plano por encima. */}
      <main className="relative flex-1 px-4 pt-[calc(env(safe-area-inset-top)+1rem)] pb-28 sm:px-8 sm:pt-[calc(env(safe-area-inset-top)+2rem)] sm:pb-12">
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
              {section === "dashboard" && (
                <DashboardScreen summary={collection.summary} sealedItems={sealed.items} planItems={plan.items} />
              )}
              {section === "coleccion" && (
                <ColeccionScreen
                  items={collection.items}
                  onAddItem={collection.addItem}
                  onUpdateItem={collection.updateItem}
                  onRemove={collection.removeItem}
                  onOverrideValue={collection.overrideValue}
                  sealedItems={sealed.items}
                  onAddSealed={sealed.addItem}
                  onUpdateSealed={sealed.updateItem}
                  onRemoveSealed={sealed.removeItem}
                  onOverrideSealedValue={sealed.overrideValue}
                  checklists={setChecklists.checklists}
                  cardsByChecklist={setChecklists.cardsByChecklist}
                  onSearchSets={setChecklists.search}
                  onSyncSet={async (externalSetId, setNameEs) => {
                    await setChecklists.sync(externalSetId, setNameEs);
                  }}
                  onResyncSet={async (checklistId) => {
                    await setChecklists.resync(checklistId);
                  }}
                  onMarkOwned={collection.addItems}
                  onRemoveItems={collection.removeItems}
                />
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
        <div className="mx-6 mb-3 flex items-center justify-around rounded-full border border-[var(--border)] bg-[var(--surface-1)]/90 px-2 py-2 shadow-float backdrop-blur-md">
          {sections.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              aria-current={section === s.id ? "page" : undefined}
              aria-label={s.label}
              className={`flex items-center justify-center rounded-full p-2.5 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--beacon)] ${
                section === s.id ? "text-[var(--beacon)]" : "text-[var(--text-muted)]"
              }`}
              style={section === s.id ? { backgroundColor: "color-mix(in srgb, var(--beacon) 14%, transparent)" } : undefined}
            >
              <s.Icon className="size-6" />
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
