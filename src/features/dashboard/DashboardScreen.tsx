import type { CollectionSummary, SealedPurchase } from "../../domain/types";
import { formatMoney } from "../../domain/calculations";
import { Card } from "../../components/Card";

function sealedValue(items: SealedPurchase[]): { value: number; invested: number; withoutValue: number } {
  let value = 0;
  let invested = 0;
  let withoutValue = 0;
  for (const item of items) {
    if (item.estimatedValueOverride !== null) value += item.estimatedValueOverride * item.quantity;
    else withoutValue++;
    if (item.purchasePrice !== null) invested += item.purchasePrice * item.quantity;
  }
  return { value, invested, withoutValue };
}

export function DashboardScreen({
  summary,
  sealedItems,
}: {
  summary: CollectionSummary | null;
  sealedItems: SealedPurchase[];
}) {
  const sealed = sealedValue(sealedItems);
  const totalValue = (summary?.totalValue ?? 0) + sealed.value;
  const totalInvested = (summary?.totalInvested ?? 0) + sealed.invested;
  const gainLoss = totalValue - totalInvested;
  const itemsWithoutValue = (summary?.itemsWithoutValue ?? 0) + sealed.withoutValue;

  return (
    <div className="flex flex-col gap-6">
      <div className="py-4 sm:py-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-primary)] sm:text-4xl">Resumen</h1>
        <p className="text-base font-normal text-[var(--text-secondary)]">El valor de toda tu colección, de un vistazo.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">Valor total estimado</h2>
          <p className="mt-2 text-4xl font-extrabold tabular-nums text-[var(--text-primary)]">{formatMoney(totalValue)}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Cartas + producto sellado, con precio de mercado o tu corrección manual.</p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">Invertido</h2>
          <p className="mt-2 text-4xl font-extrabold tabular-nums text-[var(--text-primary)]">{formatMoney(totalInvested)}</p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">Ganancia / pérdida estimada</h2>
          <p
            className="mt-2 text-4xl font-extrabold tabular-nums"
            style={{ color: gainLoss >= 0 ? "var(--status-good)" : "var(--status-critical)" }}
          >
            {gainLoss >= 0 ? "+" : ""}
            {formatMoney(gainLoss)}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">Cartas en la colección</h2>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {summary?.totalQuantity ?? 0} <span className="text-sm font-normal text-[var(--text-muted)]">unidades</span>
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">Producto sellado</h2>
          <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--text-primary)]">
            {sealedItems.length} <span className="text-sm font-normal text-[var(--text-muted)]">compras</span>
          </p>
        </Card>
      </div>

      {itemsWithoutValue > 0 && (
        <Card>
          <p className="text-sm text-[var(--text-secondary)]">
            <strong className="font-bold text-[var(--amber)]">{itemsWithoutValue}</strong> ejemplar
            {itemsWithoutValue === 1 ? "" : "es"} sin valor de mercado conocido — no cuenta{itemsWithoutValue === 1 ? "" : "n"} como
            0€ en el total, simplemente no se suma{itemsWithoutValue === 1 ? "" : "n"} hasta que tengas un precio.
          </p>
        </Card>
      )}
    </div>
  );
}
