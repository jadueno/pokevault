import { useState } from "react";
import type { CatalogCard, NewCollectionItem, NewWishlistItem } from "../../domain/types";
import { formatMoney } from "../../domain/calculations";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { inputClass } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { CardDetail } from "./CardDetail";
import { AddToCollectionForm } from "./AddToCollectionForm";
import type { useCatalogData } from "../../data/useCatalogData";

type ModalMode = "detail" | "add-to-collection";

export function BuscarScreen({
  catalog,
  onAddToCollection,
  onAddToWishlist,
}: {
  catalog: ReturnType<typeof useCatalogData>;
  onAddToCollection: (entity: NewCollectionItem) => Promise<void>;
  onAddToWishlist: (entity: NewWishlistItem) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [setId, setSetId] = useState("");
  const [selected, setSelected] = useState<CatalogCard | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>("detail");
  const [wishlistFeedback, setWishlistFeedback] = useState<string | null>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    await catalog.search(query, setId || undefined);
  }

  function openCard(card: CatalogCard) {
    setSelected(card);
    setModalMode("detail");
  }

  function closeModal() {
    setSelected(null);
    setModalMode("detail");
  }

  async function handleAddToWishlist(card: CatalogCard) {
    await onAddToWishlist({ catalogCardId: card.id, priority: "medium", maxPrice: null, targetMonth: null, notes: null });
    closeModal();
    setWishlistFeedback(`${card.name} añadida a la wishlist.`);
    setTimeout(() => setWishlistFeedback(null), 2500);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="py-4 sm:py-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">Buscar</h1>
        <p className="text-base font-normal text-[var(--text-secondary)]">
          Busca en el catálogo sincronizado para añadir cartas a tu colección o a tu wishlist.
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex flex-wrap gap-2">
        <input
          className={`${inputClass} max-w-sm`}
          placeholder="Buscar por nombre, p. ej. Charizard"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className={`${inputClass} w-auto`} value={setId} onChange={(e) => setSetId(e.target.value)}>
          <option value="">Todas las expansiones</option>
          {catalog.sets.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Button type="submit" tone="ink" disabled={catalog.loading}>
          {catalog.loading ? "Buscando…" : "Buscar"}
        </Button>
      </form>

      {catalog.error && (
        <p role="alert" className="text-sm text-[var(--status-critical)]">
          {catalog.error}
        </p>
      )}

      {wishlistFeedback && <p className="text-sm text-[var(--status-good)]">{wishlistFeedback}</p>}

      {catalog.results.length === 0 && !catalog.loading ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">
            {query || setId ? "Sin resultados para esa búsqueda." : "Escribe un nombre para empezar a buscar."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {catalog.results.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => openCard(card)}
              className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-1)] p-3 text-left shadow-card transition-shadow hover:shadow-card-hover"
            >
              {card.imageSmallUrl && (
                <img src={card.imageSmallUrl} alt={card.name} loading="lazy" className="mx-auto w-full max-w-32 rounded-lg" />
              )}
              <div>
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{card.name}</p>
                <p className="text-xs text-[var(--text-muted)]">Nº {card.number}</p>
                <p className="text-sm font-bold text-[var(--beacon)]">
                  {formatMoney(card.currentPrice, card.currentPriceCurrency ?? "EUR")}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <Modal
          title={modalMode === "detail" ? selected.name : `Añadir ${selected.name} a mi colección`}
          onClose={closeModal}
        >
          {modalMode === "detail" ? (
            <div className="flex flex-col gap-4">
              <CardDetail card={selected} />
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => handleAddToWishlist(selected)}>
                  + Añadir a wishlist
                </Button>
                <Button tone="beacon" onClick={() => setModalMode("add-to-collection")}>
                  + Añadir a mi colección
                </Button>
              </div>
            </div>
          ) : (
            <AddToCollectionForm
              catalogCardId={selected.id}
              onSubmit={async (entity) => {
                await onAddToCollection(entity);
                closeModal();
              }}
              onCancel={() => setModalMode("detail")}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
