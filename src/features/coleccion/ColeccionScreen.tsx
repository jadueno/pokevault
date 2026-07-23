import { useState } from "react";
import type {
  CardCondition,
  CardSearchMatch,
  CardVariant,
  CollectionItem,
  NewCollectionItem,
  NewSealedPurchase,
  RecognizedCardData,
  SealedPurchase,
  SetChecklist,
  SetChecklistCard,
  SetSearchCandidate,
} from "../../domain/types";
import { costPerCard, countLinkedCollectionItems, formatMoney } from "../../domain/calculations";
import { Badge, badgeToneColors, type BadgeTone } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { useConfirm } from "../../components/ConfirmProvider";
import { inputClass, focusRing } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { PhotoField } from "../../components/PhotoField";
import { PhotoLightbox } from "../../components/PhotoLightbox";
import { ScreenHeader } from "../../components/ScreenHeader";
import { CollectionQuickForm } from "./CollectionQuickForm";
import { SealedPurchaseForm } from "../sellado/SealedPurchaseForm";
import { SetChecklistTab, SetSearchPanel } from "./SetChecklistTab";

const LANGUAGE_LABELS: Record<string, string> = {
  es: "ES",
  en: "EN",
  fr: "FR",
  de: "DE",
  it: "IT",
  pt: "PT",
  ja: "JA",
  ko: "KO",
  "zh-cn": "ZH-CN",
  "zh-tw": "ZH-TW",
  id: "ID",
  th: "TH",
};

const CONDITION_LABELS: Record<string, string> = {
  mint: "Mint",
  near_mint: "Near Mint",
  excellent: "Excellent",
  good: "Good",
  light_played: "Light Played",
  played: "Played",
  poor: "Poor",
};

// De mejor a peor estado, un degradado semántico de verde a rojo — mismo lenguaje que ya
// usaban los tokens --status-* de la app (prioridad, ganancia/pérdida), aplicado ahora
// también a la condición física de la carta.
const CONDITION_TONES: Record<CardCondition, BadgeTone> = {
  mint: "good",
  near_mint: "good",
  excellent: "amber",
  good: "amber",
  light_played: "warning",
  played: "critical",
  poor: "critical",
};

const VARIANT_LABELS: Record<Exclude<CardVariant, "normal">, string> = { reverse: "Reverso", holo: "Holo" };

const PRODUCT_TYPE_LABELS: Record<string, string> = {
  booster_pack: "Sobre",
  booster_box: "Caja de sobres",
  elite_trainer_box: "Elite Trainer Box",
  bundle: "Bundle",
  tin: "Lata",
  other: "Otro",
};

function ItemCard({
  item,
  sealedPurchase,
  linkedCardCount,
  onEdit,
  onRemove,
  onOverrideValue,
}: {
  item: CollectionItem;
  /** El sobre/caja del que salió esta carta (`item.sealedPurchaseId`), si lo tiene y sigue
   * existiendo — para poder calcular y mostrar el coste repartido. */
  sealedPurchase: SealedPurchase | null;
  /** Cuántas cartas de toda la colección están vinculadas a ese mismo sobre (incluida esta). */
  linkedCardCount: number;
  onEdit: (item: CollectionItem) => void;
  onRemove: (id: string) => Promise<void>;
  onOverrideValue: (id: string, value: number, note: string | null) => Promise<void>;
}) {
  const confirm = useConfirm();
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState(String(item.estimatedValueOverride ?? ""));
  const [busy, setBusy] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  async function handleRemove() {
    if (await confirm(`¿Eliminar este ejemplar de "${item.name}"? Esta acción no se puede deshacer.`)) {
      await onRemove(item.id);
    }
  }

  async function handleSaveValue() {
    const value = Number(valueInput);
    if (!Number.isFinite(value)) return;
    setBusy(true);
    try {
      await onOverrideValue(item.id, value, "Corrección manual");
      setEditingValue(false);
    } finally {
      setBusy(false);
    }
  }

  const conditionColor = badgeToneColors[CONDITION_TONES[item.condition]].bg;
  // Coste repartido: nunca se guarda en `item.purchasePrice` (seguiría siendo "no lo sé"
  // si vino de un sobre) — se calcula siempre al vuelo a partir del precio del sobre y
  // cuántas cartas se le han vinculado hasta ahora, para que no se quede desactualizado.
  const estimatedFromPack = sealedPurchase ? costPerCard(sealedPurchase, linkedCardCount) : null;

  return (
    <Card
      variant="gradient"
      className="flex flex-col gap-3"
      // Igual que la prioridad en wishlist: el estado de conservación tiñe toda la
      // tarjeta (verde = mint, ámbar = medio, rojo = jugada), no solo la insignia.
      style={{
        background: `linear-gradient(165deg, color-mix(in srgb, ${conditionColor} 28%, var(--surface-2)) 0%, var(--surface-1) 62%, var(--page) 145%)`,
      }}
    >
      <div className="flex items-start gap-3">
        {item.photo ? (
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label={`Ver foto de ${item.name} en grande`}
            className={`shrink-0 rounded-xl ${focusRing}`}
          >
            <img src={item.photo} alt={item.name} loading="lazy" className="w-20 rounded-xl object-cover shadow-card" />
          </button>
        ) : (
          <div
            aria-hidden="true"
            className="flex w-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--border)] py-6 text-2xl text-[var(--text-muted)]"
          >
            🎴
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">{item.name}</p>
          {item.setName && <p className="truncate text-xs text-[var(--text-muted)]">{item.setName}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="info">{LANGUAGE_LABELS[item.language]}</Badge>
            <Badge tone={CONDITION_TONES[item.condition]}>{CONDITION_LABELS[item.condition]}</Badge>
            {item.variant !== "normal" && <Badge tone="amber">✨ {VARIANT_LABELS[item.variant]}</Badge>}
            <span className="text-xs font-semibold text-[var(--text-muted)]">x{item.quantity}</span>
            {item.isGraded && (
              <Badge tone="beacon">
                {item.gradingCompany} {item.grade}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">Comprada por</span>
        <span className="font-semibold text-[var(--text-primary)]">
          {item.purchasePrice !== null ? (
            formatMoney(item.purchasePrice, item.purchaseCurrency)
          ) : estimatedFromPack !== null ? (
            <>
              ≈{formatMoney(estimatedFromPack)}{" "}
              <span className="font-normal text-[var(--text-muted)]">
                (repartido, {linkedCardCount} carta{linkedCardCount === 1 ? "" : "s"})
              </span>
            </>
          ) : (
            "Sin precio (salió de un sobre)"
          )}
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">Valor estimado</span>
        {editingValue ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.01"
              className={`${inputClass} w-24 text-right`}
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              autoFocus
            />
            <Button size="sm" variant="ghost" disabled={busy} onClick={handleSaveValue}>
              OK
            </Button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditingValue(true)} className="font-semibold text-[var(--amber)] hover:underline">
            {item.estimatedValueOverride !== null ? formatMoney(item.estimatedValueOverride) : "Sin valor conocido"}
          </button>
        )}
      </div>

      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => onEdit(item)}
          aria-label={`Editar ejemplar de ${item.name}`}
          className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--gridline)] hover:text-[var(--text-primary)]"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={handleRemove}
          aria-label={`Eliminar ejemplar de ${item.name}`}
          className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--gridline)] hover:text-[var(--status-critical)]"
        >
          Eliminar
        </button>
      </div>

      {lightboxOpen && item.photo && (
        <PhotoLightbox src={item.photo} alt={item.name} onClose={() => setLightboxOpen(false)} />
      )}
    </Card>
  );
}

function SealedItemCard({
  item,
  linkedCardCount,
  onEdit,
  onUpdate,
  onRemove,
  onOverrideValue,
}: {
  item: SealedPurchase;
  /** Cuántas cartas de la colección se han vinculado ya a este sobre concreto. */
  linkedCardCount: number;
  onEdit: (item: SealedPurchase) => void;
  onUpdate: (id: string, entity: NewSealedPurchase) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onOverrideValue: (id: string, value: number, note: string | null) => Promise<void>;
}) {
  const confirm = useConfirm();
  const [editingValue, setEditingValue] = useState(false);
  const [valueInput, setValueInput] = useState(String(item.estimatedValueOverride ?? ""));
  const [busy, setBusy] = useState(false);

  async function handleRemove() {
    if (await confirm(`¿Eliminar "${item.productName}"? Esta acción no se puede deshacer.`)) {
      await onRemove(item.id);
    }
  }

  async function handleSaveValue() {
    const value = Number(valueInput);
    if (!Number.isFinite(value)) return;
    setBusy(true);
    try {
      await onOverrideValue(item.id, value, "Estimado a mano");
      setEditingValue(false);
    } finally {
      setBusy(false);
    }
  }

  function handlePhotoChange(photo: string | null) {
    const { id: _id, ...rest } = item;
    onUpdate(item.id, { ...rest, photo });
  }

  return (
    <Card variant="gradient" className="flex flex-col gap-3">
      <PhotoField label="Foto" photo={item.photo} onChange={handlePhotoChange} />

      <div>
        <p className="truncate font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">{item.productName}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Badge tone="amber">{PRODUCT_TYPE_LABELS[item.productType]}</Badge>
          <span className="text-xs font-semibold text-[var(--text-muted)]">x{item.quantity}</span>
          {item.location && <span className="text-xs text-[var(--text-muted)]">· {item.location}</span>}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">Comprado por</span>
        <span className="font-semibold text-[var(--text-primary)]">
          {item.purchasePrice !== null ? formatMoney(item.purchasePrice, item.purchaseCurrency) : "—"}
        </span>
      </div>

      {linkedCardCount > 0 && (
        <p className="text-sm text-[var(--text-muted)]">
          🎴 {linkedCardCount} carta{linkedCardCount === 1 ? "" : "s"} de la colección vinculada{linkedCardCount === 1 ? "" : "s"} a
          este sobre
          {costPerCard(item, linkedCardCount) !== null && (
            <>
              {" "}
              · <span className="font-semibold text-[var(--amber)]">≈{formatMoney(costPerCard(item, linkedCardCount))}/carta</span>
            </>
          )}
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-muted)]">Valor estimado</span>
        {editingValue ? (
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              step="0.01"
              className={`${inputClass} w-24 text-right`}
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              autoFocus
            />
            <Button size="sm" variant="ghost" disabled={busy} onClick={handleSaveValue}>
              OK
            </Button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setEditingValue(true)}
            className="font-semibold text-[var(--amber)] hover:underline"
          >
            {item.estimatedValueOverride !== null ? formatMoney(item.estimatedValueOverride) : "Sin estimar"}
          </button>
        )}
      </div>

      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => onEdit(item)}
          aria-label={`Editar ${item.productName}`}
          className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--gridline)] hover:text-[var(--text-primary)]"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={handleRemove}
          aria-label={`Eliminar ${item.productName}`}
          className="rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] transition-colors hover:bg-[var(--gridline)] hover:text-[var(--status-critical)]"
        >
          Eliminar
        </button>
      </div>
    </Card>
  );
}

export function ColeccionScreen({
  items,
  onAddItem,
  onUpdateItem,
  onRemove,
  onOverrideValue,
  sealedItems,
  onAddSealed,
  onUpdateSealed,
  onRemoveSealed,
  onOverrideSealedValue,
  checklists,
  cardsByChecklist,
  onSearchSets,
  onSyncSet,
  onResyncSet,
  onMarkOwned,
  onRemoveItems,
  onRecognizeCard,
  onSearchCards,
}: {
  items: CollectionItem[];
  onAddItem: (entity: NewCollectionItem) => Promise<void>;
  onUpdateItem: (id: string, entity: NewCollectionItem) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
  onOverrideValue: (id: string, value: number, note: string | null) => Promise<void>;
  sealedItems: SealedPurchase[];
  onAddSealed: (entity: NewSealedPurchase) => Promise<void>;
  onUpdateSealed: (id: string, entity: NewSealedPurchase) => Promise<void>;
  onRemoveSealed: (id: string) => Promise<void>;
  onOverrideSealedValue: (id: string, value: number, note: string | null) => Promise<void>;
  checklists: SetChecklist[];
  cardsByChecklist: Record<string, SetChecklistCard[]>;
  onSearchSets: (query: string) => Promise<SetSearchCandidate[]>;
  onSyncSet: (externalSetId: string, setNameEs: string | null) => Promise<void>;
  onResyncSet: (checklistId: string) => Promise<void>;
  onMarkOwned: (entities: NewCollectionItem[]) => Promise<void>;
  onRemoveItems: (ids: string[]) => Promise<void>;
  onRecognizeCard: (imageDataUrl: string) => Promise<RecognizedCardData>;
  onSearchCards: (name: string, setName: string | null, number: string | null) => Promise<CardSearchMatch[]>;
}) {
  const [query, setQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSealedForm, setShowSealedForm] = useState(false);
  const [showSetSearch, setShowSetSearch] = useState(false);
  const [editingItem, setEditingItem] = useState<CollectionItem | null>(null);
  const [editingSealed, setEditingSealed] = useState<SealedPurchase | null>(null);
  const [tab, setTab] = useState<"cartas" | "sellado" | "sets">("sets");

  const q = query.trim().toLowerCase();
  const filteredItems = q ? items.filter((i) => `${i.name} ${i.setName ?? ""}`.toLowerCase().includes(q)) : items;
  const filteredSealed = q ? sealedItems.filter((i) => i.productName.toLowerCase().includes(q)) : sealedItems;

  const isEmpty = items.length === 0 && sealedItems.length === 0;

  // Cuántas cartas están vinculadas a cada sobre, calculado una vez para toda la lista en
  // vez de recorrer `items` entero por cada tarjeta — no cambia el resultado, solo evita el
  // trabajo repetido de countLinkedCollectionItems por cada ItemCard/SealedItemCard.
  const linkedCountsBySealedId = new Map<string, number>();
  for (const sealed of sealedItems) {
    linkedCountsBySealedId.set(sealed.id, countLinkedCollectionItems(sealed.id, items));
  }

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader title="Mi colección" subtitle="Tus cartas y tu producto sellado, todo en un mismo sitio." />

      {
        // Las pestañas se muestran siempre, incluso sin nada todavía: "Sets" es ahora la
        // vía principal de alta de cartas, así que tiene que poder alcanzarse desde una
        // colección vacía (antes se ocultaban por completo hasta tener algo).
      }
      <div className="flex flex-nowrap items-center justify-between gap-2">
          <div className="flex min-w-0 gap-1 overflow-x-auto rounded-full border border-[var(--border)] bg-[var(--surface-1)] p-1">
            {(
              [
                { id: "sets", label: `Sets (${checklists.length})` },
                { id: "cartas", label: `Cartas (${items.length})` },
                { id: "sellado", label: `Sellado (${sealedItems.length})` },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={tab === t.id ? "page" : undefined}
                // Tinte en vez de rojo sólido: es un selector de vista, no una acción —
                // el rojo saturado se reserva para el FAB y los botones de guardar/enviar.
                className={`shrink-0 rounded-full px-2.5 py-1.5 text-xs font-bold whitespace-nowrap transition-colors sm:px-4 sm:text-sm ${focusRing} ${
                  tab === t.id ? "text-[var(--beacon)]" : "text-[var(--text-secondary)] hover:bg-[var(--gridline)]"
                }`}
                style={tab === t.id ? { backgroundColor: "color-mix(in srgb, var(--beacon) 14%, transparent)" } : undefined}
              >
                {t.label}
              </button>
            ))}
          </div>
        {tab === "sellado" && (
          <Button tone="beacon" size="sm" onClick={() => setShowSealedForm(true)} className="shrink-0">
            + Compra
          </Button>
        )}
        {tab === "sets" && (
          <Button tone="beacon" size="sm" onClick={() => setShowSetSearch(true)} className="shrink-0">
            + Set
          </Button>
        )}
      </div>

      {!isEmpty && tab !== "sets" && (
        <div className="relative max-w-sm">
          <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[var(--text-muted)]">
            🔍
          </span>
          <input
            className={`${inputClass} rounded-full py-2.5 pl-9`}
            placeholder="Buscar en toda tu colección…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {showSealedForm && (
        <SealedPurchaseForm
          onSubmit={async (entity) => {
            await onAddSealed(entity);
            setShowSealedForm(false);
          }}
          onCancel={() => setShowSealedForm(false)}
        />
      )}

      {editingSealed && (
        <SealedPurchaseForm
          initialValue={editingSealed}
          onSubmit={async (entity) => {
            await onUpdateSealed(editingSealed.id, entity);
            setEditingSealed(null);
          }}
          onCancel={() => setEditingSealed(null)}
        />
      )}

      {editingItem && (
        <Modal title="Editar carta" onClose={() => setEditingItem(null)}>
          <CollectionQuickForm
            initialItem={editingItem}
            sealedItems={sealedItems}
            collectionItems={items}
            checklists={checklists}
            cardsByChecklist={cardsByChecklist}
            onRecognizeCard={onRecognizeCard}
            onSearchCards={onSearchCards}
            onSubmit={async (entity) => {
              await onUpdateItem(editingItem.id, entity);
              setEditingItem(null);
            }}
            onCancel={() => setEditingItem(null)}
          />
        </Modal>
      )}

      {showSetSearch && (
        <Modal
          title="Buscar un set nuevo"
          description="El proveedor solo tiene nombres en inglés — prueba con el nombre en inglés del set."
          onClose={() => setShowSetSearch(false)}
        >
          <SetSearchPanel checklists={checklists} onSearch={onSearchSets} onSync={onSyncSet} />
        </Modal>
      )}

      {showAddForm && (
        <Modal title="Añadir carta suelta" onClose={() => setShowAddForm(false)}>
          <CollectionQuickForm
            sealedItems={sealedItems}
            collectionItems={items}
            checklists={checklists}
            cardsByChecklist={cardsByChecklist}
            onRecognizeCard={onRecognizeCard}
            onSearchCards={onSearchCards}
            onSubmit={async (entity) => {
              await onAddItem(entity);
              setShowAddForm(false);
            }}
            onCancel={() => setShowAddForm(false)}
          />
        </Modal>
      )}

      {isEmpty && checklists.length === 0 && tab !== "sets" ? (
        <Card>
          <p className="text-sm text-[var(--text-muted)]">
            🎴 Todavía no has añadido nada a tu colección. Busca un set en la pestaña "Sets" para marcar tus cartas, o usa el botón
            "+" para una carta suelta.
          </p>
        </Card>
      ) : tab === "cartas" ? (
        filteredItems.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--text-muted)]">
              {items.length === 0 ? "Todavía no tienes cartas registradas." : "Sin resultados para esa búsqueda."}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                sealedPurchase={item.sealedPurchaseId ? (sealedItems.find((s) => s.id === item.sealedPurchaseId) ?? null) : null}
                linkedCardCount={item.sealedPurchaseId ? (linkedCountsBySealedId.get(item.sealedPurchaseId) ?? 0) : 0}
                onEdit={setEditingItem}
                onRemove={onRemove}
                onOverrideValue={onOverrideValue}
              />
            ))}
          </div>
        )
      ) : tab === "sellado" ? (
        filteredSealed.length === 0 ? (
          <Card>
            <p className="text-sm text-[var(--text-muted)]">
              {sealedItems.length === 0 ? "Todavía no has registrado ningún producto sellado." : "Sin resultados para esa búsqueda."}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredSealed.map((item) => (
              <SealedItemCard
                key={item.id}
                item={item}
                linkedCardCount={linkedCountsBySealedId.get(item.id) ?? 0}
                onEdit={setEditingSealed}
                onUpdate={onUpdateSealed}
                onRemove={onRemoveSealed}
                onOverrideValue={onOverrideSealedValue}
              />
            ))}
          </div>
        )
      ) : (
        <SetChecklistTab
          checklists={checklists}
          cardsByChecklist={cardsByChecklist}
          collectionItems={items}
          onResyncSet={onResyncSet}
          onMarkOwned={onMarkOwned}
          onRemoveItems={onRemoveItems}
        />
      )}

      {tab === "cartas" && (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          aria-label="Añadir carta suelta"
          className="fixed right-4 bottom-[var(--nav-clearance)] z-20 flex size-14 items-center justify-center rounded-full text-2xl font-bold text-[var(--on-hero)] shadow-float transition-transform hover:scale-105 active:scale-95 sm:right-8 sm:bottom-8"
          style={{ background: "var(--hero-gradient)" }}
        >
          +
        </button>
      )}
    </div>
  );
}
