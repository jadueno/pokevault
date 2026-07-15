import type { CatalogCard } from "../../domain/types";
import { formatMoney } from "../../domain/calculations";

export function CardDetail({ card }: { card: CatalogCard }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {card.imageLargeUrl && (
        <img
          src={card.imageLargeUrl}
          alt={card.name}
          loading="lazy"
          className="mx-auto w-48 shrink-0 rounded-xl border border-[var(--border)] sm:mx-0"
        />
      )}
      {/* El nombre ya aparece como título del Modal que envuelve este componente —
          repetirlo aquí como encabezado sería un duplicado real, no solo de test. */}
      <div className="flex flex-col gap-2 text-sm text-[var(--text-secondary)]">
        <p>
          Número {card.number} · {card.rarity ?? "Rareza desconocida"}
        </p>
        {card.artist && <p>Ilustrador: {card.artist}</p>}
        {card.types.length > 0 && <p>Tipo: {card.types.join(", ")}</p>}
        <div className="mt-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3">
          <p className="text-lg font-bold text-[var(--text-primary)]">
            {formatMoney(card.currentPrice, card.currentPriceCurrency ?? "EUR")}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            {card.priceUpdatedAt && card.priceSource
              ? `Actualizado el ${new Date(card.priceUpdatedAt).toLocaleDateString("es-ES")} (fuente: ${card.priceSource})`
              : "Sin precio conocido todavía"}
          </p>
        </div>
      </div>
    </div>
  );
}
