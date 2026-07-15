import { useState } from "react";
import { useCatalogData } from "./data/useCatalogData";
import { useCollectionData } from "./data/useCollectionData";
import { useWishlistData } from "./data/useWishlistData";
import { useSealedData } from "./data/useSealedData";
import { BuscarScreen } from "./features/buscar/BuscarScreen";
import { ColeccionScreen } from "./features/coleccion/ColeccionScreen";
import { SelladoScreen } from "./features/sellado/SelladoScreen";
import { WishlistScreen } from "./features/wishlist/WishlistScreen";
import { DashboardScreen } from "./features/dashboard/DashboardScreen";
import { LoadingState } from "./components/LoadingState";

type Section = "dashboard" | "buscar" | "coleccion" | "wishlist" | "sellado";

const sections: { id: Section; label: string }[] = [
  { id: "dashboard", label: "Resumen" },
  { id: "buscar", label: "Buscar" },
  { id: "coleccion", label: "Mi colección" },
  { id: "wishlist", label: "Wishlist" },
  { id: "sellado", label: "Sellado" },
];

export default function App() {
  const [section, setSection] = useState<Section>("dashboard");
  const catalog = useCatalogData();
  const collection = useCollectionData();
  const wishlist = useWishlistData();
  const sealed = useSealedData();

  const loading = collection.loading && !collection.summary;
  const error = collection.error ?? wishlist.error ?? sealed.error;

  return (
    <div className="app-shell flex min-h-screen flex-col sm:flex-row">
      <nav
        aria-label="Secciones de la app"
        className="hidden shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--surface-1)] p-4 sm:sticky sm:top-0 sm:flex sm:h-screen sm:w-56"
      >
        <div className="mb-4 flex items-center gap-2.5 px-2">
          <span className="text-xl" aria-hidden="true">
            🎴
          </span>
          <p className="text-sm leading-tight font-bold text-[var(--text-primary)]">PokéVault</p>
        </div>
        {sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSection(s.id)}
            aria-current={section === s.id ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-full px-4 py-2.5 text-left text-sm font-semibold whitespace-nowrap transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--beacon)] ${
              section === s.id
                ? "bg-[var(--ink)] text-[var(--on-ink)]"
                : "text-[var(--text-secondary)] hover:bg-[var(--gridline)]"
            }`}
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
              {section === "buscar" && (
                <BuscarScreen
                  catalog={catalog}
                  onAddToCollection={collection.addItem}
                  onAddToWishlist={wishlist.addItem}
                />
              )}
              {section === "coleccion" && (
                <ColeccionScreen items={collection.items} onRemove={collection.removeItem} onOverrideValue={collection.overrideValue} />
              )}
              {section === "wishlist" && (
                <WishlistScreen
                  items={wishlist.items}
                  onUpdate={wishlist.updateItem}
                  onRemove={wishlist.removeItem}
                  onMoveToCollection={async (id, details) => {
                    await wishlist.moveToCollection(id, details);
                    await collection.reload();
                  }}
                />
              )}
              {section === "sellado" && (
                <SelladoScreen
                  items={sealed.items}
                  onAdd={sealed.addItem}
                  onRemove={sealed.removeItem}
                  onOverrideValue={sealed.overrideValue}
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
              className={`flex flex-1 flex-col items-center gap-0.5 rounded-full px-0.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--beacon)] ${
                section === s.id ? "bg-[var(--ink)] text-[var(--on-ink)]" : "text-[var(--text-muted)]"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
