import type { CollectionSummary, SealedPurchase } from "../../domain/types";
import { formatMoney } from "../../domain/calculations";
import { Card } from "../../components/Card";
import { ScreenHeader } from "../../components/ScreenHeader";

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
  onOpenPlan,
}: {
  summary: CollectionSummary | null;
  sealedItems: SealedPurchase[];
  onOpenPlan: () => void;
}) {
  const sealed = sealedValue(sealedItems);
  const totalValue = (summary?.totalValue ?? 0) + sealed.value;
  const totalInvested = (summary?.totalInvested ?? 0) + sealed.invested;
  const gainLoss = totalValue - totalInvested;
  const itemsWithoutValue = (summary?.itemsWithoutValue ?? 0) + sealed.withoutValue;

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Resumen" subtitle="El valor de toda tu colección, de un vistazo." />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card variant="gradient" className="sm:col-span-1">
          <h2 className="text-sm font-semibold text-white/70">Valor total estimado</h2>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums text-[var(--on-hero)]">
            {formatMoney(totalValue)}
          </p>
          <p className="mt-1 text-xs text-white/60">Cartas + producto sellado, con precio de mercado o tu corrección manual.</p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">Invertido</h2>
          <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums text-[var(--text-primary)]">
            {formatMoney(totalInvested)}
          </p>
        </Card>
        <Card>
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">Ganancia / pérdida estimada</h2>
          <p
            className="mt-2 font-[family-name:var(--font-display)] text-4xl font-bold tabular-nums"
            style={{ color: gainLoss >= 0 ? "var(--status-good)" : "var(--status-critical)" }}
          >
            {gainLoss >= 0 ? "+" : ""}
            {formatMoney(gainLoss)}
          </p>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
        <button
          type="button"
          onClick={onOpenPlan}
          className="group min-w-0 rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-1)] p-5 text-left shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:p-6"
        >
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">Plan de compra</h2>
          <p className="mt-2 flex items-center gap-1.5 text-2xl font-bold text-[var(--beacon)]">
            Ver plan <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
          </p>
        </button>
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
