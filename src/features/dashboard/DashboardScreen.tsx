import type { CollectionSummary, PlanItem, SealedPurchase } from "../../domain/types";
import { formatMoney, totalPlanInvested } from "../../domain/calculations";
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
  planItems,
}: {
  summary: CollectionSummary | null;
  sealedItems: SealedPurchase[];
  planItems: PlanItem[];
}) {
  const sealed = sealedValue(sealedItems);
  // El plan solo aporta al invertido, nunca al valor: muchos ítems del plan (accesorios,
  // cantidades por rareza) no tienen fila propia en collection_items/sealed_purchases con
  // la que calcular un valor de mercado, así que sumar aquí sin un valor equivalente en
  // el otro lado es más honesto que inventarlo — el hueco se nota en la ganancia/pérdida.
  const planInvested = totalPlanInvested(planItems);
  const totalValue = (summary?.totalValue ?? 0) + sealed.value;
  const totalInvested = (summary?.totalInvested ?? 0) + sealed.invested + planInvested;
  const gainLoss = totalValue - totalInvested;
  const itemsWithoutValue = (summary?.itemsWithoutValue ?? 0) + sealed.withoutValue;

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Resumen" subtitle="El valor de toda tu colección, de un vistazo." />

      {/* Bento: "Valor total estimado" es la cifra que más importa, así que ocupa el doble
          de ancho y de alto que el resto — el resto de tarjetas quedan deliberadamente más
          pequeñas para no competir por la atención. */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Única tarjeta con fondo --hero-gradient (no --card-gradient, que con el tema
            claro se aclara hacia blanco): es la cifra protagonista del bento, con el
            mismo tratamiento "sticker" saturado que ScreenHeader, así que el texto en
            blanco necesita un fondo oscuro de verdad para tener contraste. */}
        <Card
          variant="gradient"
          className="flex flex-col justify-between sm:col-span-2 sm:row-span-2"
          style={{ background: "var(--hero-gradient)" }}
        >
          <h2 className="text-sm font-semibold text-white/70">Valor total estimado</h2>
          <p className="mt-3 font-[family-name:var(--font-display)] text-5xl font-bold tabular-nums text-[var(--on-hero)] sm:text-6xl">
            {formatMoney(totalValue)}
          </p>
          <p className="mt-4 max-w-sm text-xs text-white/60">
            Cartas + producto sellado, con precio de mercado o tu corrección manual.
          </p>
        </Card>
        <Card className="flex flex-col justify-center">
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">Invertido</h2>
          <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-[var(--text-primary)]">
            {formatMoney(totalInvested)}
          </p>
        </Card>
        <Card className="flex flex-col justify-center">
          <h2 className="text-sm font-semibold text-[var(--text-muted)]">Ganancia / pérdida estimada</h2>
          <p
            className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums"
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
