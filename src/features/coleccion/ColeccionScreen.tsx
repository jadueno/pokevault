import { useState } from "react";
import type {
  CardSearchMatch,
  CollectionItem,
  NewCollectionItem,
  NewSealedPurchase,
  SealedPurchase,
  SetChecklist,
  SetChecklistCard,
  SetSearchCandidate,
} from "../../domain/types";
import { countLinkedCollectionItems } from "../../domain/calculations";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { focusRing, inputClass } from "../../components/Field";
import { Modal } from "../../components/Modal";
import { ScreenHeader } from "../../components/ScreenHeader";
import { CollectionQuickForm } from "./CollectionQuickForm";
import { ItemCard } from "./ItemCard";
import { SealedItemCard } from "./SealedItemCard";
import { SealedPurchaseForm } from "../sellado/SealedPurchaseForm";
import { PokemonBinderForm, SetChecklistTab, SetSearchPanel } from "./SetChecklistTab";

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
  onCreateBinder,
  onResyncSet,
  onMarkOwned,
  onRemoveItems,
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
  /** Crea un "binder" personalizado con todas las cartas de uno o varios Pokémon, de
   * cualquier expansión donde hayan salido — alternativa a sincronizar un set oficial
   * completo (ver SetChecklist.kind). */
  onCreateBinder: (title: string, pokemonNames: string[]) => Promise<void>;
  onResyncSet: (checklistId: string) => Promise<void>;
  onMarkOwned: (entities: NewCollectionItem[]) => Promise<void>;
  onRemoveItems: (ids: string[]) => Promise<void>;
  onSearchCards: (name: string, setName: string | null, number: string | null) => Promise<CardSearchMatch[]>;
}) {
  const [query, setQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showSealedForm, setShowSealedForm] = useState(false);
  const [showSetSearch, setShowSetSearch] = useState(false);
  const [showBinderForm, setShowBinderForm] = useState(false);
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
                { id: "sets", label: "Sets" },
                { id: "cartas", label: "Cartas" },
                { id: "sellado", label: "Sellado" },
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
        {tab === "cartas" && (
          <Button tone="beacon" size="sm" onClick={() => setShowAddForm(true)} className="shrink-0">
            + Carta
          </Button>
        )}
        {tab === "sellado" && (
          <Button tone="beacon" size="sm" onClick={() => setShowSealedForm(true)} className="shrink-0">
            + Compra
          </Button>
        )}
        {tab === "sets" && (
          <div className="flex shrink-0 gap-2">
            <Button tone="beacon" size="sm" onClick={() => setShowSetSearch(true)}>
              + Set
            </Button>
            <Button variant="tint" tone="ink" size="sm" onClick={() => setShowBinderForm(true)}>
              + Binder
            </Button>
          </div>
        )}
      </div>

      {/* El total ya no va en la propia pestaña (poco sitio desde que "+ Binder" comparte
          fila con "+ Set"/"+ Compra") — se muestra aquí, dentro del contenido de la
          pestaña activa, en su lugar. */}
      <p className="text-sm text-[var(--text-muted)]">
        {tab === "sets" && `${checklists.length} sets y binders`}
        {tab === "cartas" && `${items.length} carta${items.length === 1 ? "" : "s"}`}
        {tab === "sellado" && `${sealedItems.length} compra${sealedItems.length === 1 ? "" : "s"}`}
      </p>

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

      {showBinderForm && (
        <Modal
          title="Crear un binder personalizado"
          description="Reúne todas las cartas de uno o varios Pokémon, de cualquier expansión donde hayan salido, en un único checklist (p. ej. un binder de Slowpoke y Slowbro)."
          onClose={() => setShowBinderForm(false)}
        >
          <PokemonBinderForm onCreate={onCreateBinder} />
        </Modal>
      )}

      {showAddForm && (
        <Modal title="Añadir carta suelta" onClose={() => setShowAddForm(false)}>
          <CollectionQuickForm
            sealedItems={sealedItems}
            collectionItems={items}
            checklists={checklists}
            cardsByChecklist={cardsByChecklist}
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
            "+ Carta" para una carta suelta.
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
    </div>
  );
}
