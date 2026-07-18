import { useState } from "react";
import type {
  CollectionItem,
  NewCollectionItem,
  NewSealedPurchase,
  NewWishlistItem,
  RecognizedCardData,
  SealedPurchase,
  SetChecklist,
  SetChecklistCard,
} from "../../domain/types";
import { recognizeCard } from "../../data/api";
import { costPerCard, countLinkedCollectionItems, formatMoney } from "../../domain/calculations";
import { Badge, type BadgeTone } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { focusRing } from "../../components/Field";
import { PhotoLightbox } from "../../components/PhotoLightbox";
import { ScreenHeader } from "../../components/ScreenHeader";
import { PhotoCapture } from "./PhotoCapture";
import { CollectionQuickForm } from "./CollectionQuickForm";
import { WishlistQuickForm } from "./WishlistQuickForm";
import { SealedPurchaseForm } from "../sellado/SealedPurchaseForm";

type Destination = "coleccion" | "wishlist" | "sellado";

const CONFIDENCE_LABELS: Record<string, string> = { high: "Alta", medium: "Media", low: "Baja" };
const CONFIDENCE_TONES: Record<string, BadgeTone> = { high: "good", medium: "amber", low: "critical" };

export function AnadirScreen({
  sealedItems,
  collectionItems,
  checklists,
  cardsByChecklist,
  onAddToCollection,
  onAddToWishlist,
  onAddToSealed,
}: {
  sealedItems: SealedPurchase[];
  collectionItems: CollectionItem[];
  checklists: SetChecklist[];
  cardsByChecklist: Record<string, SetChecklistCard[]>;
  onAddToCollection: (entity: NewCollectionItem) => Promise<void>;
  onAddToWishlist: (entity: NewWishlistItem) => Promise<void>;
  onAddToSealed: (entity: NewSealedPurchase) => Promise<void>;
}) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [recognized, setRecognized] = useState<RecognizedCardData | null>(null);
  const [recognizeError, setRecognizeError] = useState<string | null>(null);
  const [destination, setDestination] = useState<Destination | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Se mantiene entre altas (no lo toca `reset()`) para poder añadir varias cartas seguidas
  // del mismo sobre sin tener que volver a elegirlo en cada foto — ver el aviso de abajo.
  const [stickySealedPurchaseId, setStickySealedPurchaseId] = useState<string | null>(null);
  const stickySealedPurchase = stickySealedPurchaseId ? sealedItems.find((s) => s.id === stickySealedPurchaseId) : undefined;

  function reset() {
    setPhoto(null);
    setRecognizing(false);
    setRecognized(null);
    setRecognizeError(null);
    setDestination(null);
  }

  async function handleCapture(dataUrl: string) {
    setPhoto(dataUrl);
    setRecognizing(true);
    setRecognizeError(null);
    try {
      setRecognized(await recognizeCard(dataUrl));
    } catch (e) {
      setRecognizeError(e instanceof Error ? e.message : "No se ha podido identificar la foto");
    } finally {
      setRecognizing(false);
      // Con un sobre "pegado" (modo añadir varias cartas seguidas), se salta directo al
      // formulario de colección en vez de obligar a pulsar "+ A mi colección" en cada foto
      // — solo una vez terminado el reconocimiento, para que el formulario nazca ya con los
      // datos de la IA en vez de en blanco.
      if (stickySealedPurchaseId) setDestination("coleccion");
    }
  }

  async function handleSaved(kind: Destination, name: string) {
    const labels: Record<Destination, string> = { coleccion: "tu colección", wishlist: "la wishlist", sellado: "producto sellado" };
    setSavedMessage(`${name} añadida a ${labels[kind]}.`);
    reset();
    setTimeout(() => setSavedMessage(null), 3000);
  }

  return (
    <div className="flex flex-col gap-6">
      <ScreenHeader
        title="Añadir"
        subtitle="Haz una foto a lo que has comprado. Se identifica automáticamente y revisas los datos antes de guardar."
      />

      {savedMessage && (
        <p className="flex items-center gap-1.5 text-sm font-semibold text-[var(--status-good)]">✓ {savedMessage}</p>
      )}

      {stickySealedPurchase &&
        (() => {
          const linked = countLinkedCollectionItems(stickySealedPurchase.id, collectionItems);
          const perCard = costPerCard(stickySealedPurchase, linked);
          return (
            <Card className="flex items-center justify-between gap-3">
              <div className="min-w-0 text-sm">
                <p className="text-xs text-[var(--text-muted)]">Añadiendo cartas de</p>
                <p className="truncate font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">
                  {stickySealedPurchase.productName}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {linked} carta{linked === 1 ? "" : "s"} de este sobre
                  {perCard !== null && (
                    <>
                      {" "}
                      · <span className="font-semibold text-[var(--amber)]">≈{formatMoney(perCard)}/carta</span>
                    </>
                  )}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStickySealedPurchaseId(null)} className="shrink-0">
                Cambiar de sobre
              </Button>
            </Card>
          );
        })()}

      {!photo && (
        <Card>
          <PhotoCapture onCapture={handleCapture} />
        </Card>
      )}

      {photo && (
        <Card variant="gradient" className="flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              aria-label="Ver foto en grande"
              className={`shrink-0 rounded-xl ${focusRing}`}
            >
              <img src={photo} alt="Foto tomada" className="w-24 rounded-xl border border-[var(--border)] shadow-card" />
            </button>
            <div className="min-w-0 flex-1">
              {recognizing && <p className="text-sm text-[var(--text-secondary)]">Identificando…</p>}
              {!recognizing && recognizeError && (
                <p className="text-sm text-[var(--status-critical)]">
                  No se ha podido identificar automáticamente ({recognizeError}). Rellena los datos a mano.
                </p>
              )}
              {!recognizing && recognized && !recognizeError && (
                <div className="text-sm text-[var(--text-secondary)]">
                  {recognized.name ? (
                    <>
                      <p className="font-[family-name:var(--font-display)] font-bold text-[var(--text-primary)]">{recognized.name}</p>
                      {recognized.setName && <p>{recognized.setName}</p>}
                      {(recognized.number || recognized.rarity) && (
                        <p>{[recognized.number, recognized.rarity].filter(Boolean).join(" · ")}</p>
                      )}
                      {recognized.confidence && (
                        <div className="mt-1.5">
                          <Badge tone={CONFIDENCE_TONES[recognized.confidence]}>
                            Confianza {CONFIDENCE_LABELS[recognized.confidence]}
                          </Badge>
                        </div>
                      )}
                    </>
                  ) : (
                    <p>No se ha podido identificar nada en la foto. Rellena los datos a mano.</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {!recognizing && !destination && (
            <div className="flex flex-wrap gap-2">
              <Button tone="beacon" onClick={() => setDestination("coleccion")}>
                + A mi colección
              </Button>
              <Button variant="tint" onClick={() => setDestination("wishlist")}>
                + A la wishlist
              </Button>
              <Button variant="tint" onClick={() => setDestination("sellado")}>
                + A producto sellado
              </Button>
              <Button variant="ghost" onClick={reset} className="ml-auto">
                Empezar de nuevo
              </Button>
            </div>
          )}
        </Card>
      )}

      {lightboxOpen && photo && <PhotoLightbox src={photo} alt="Foto tomada" onClose={() => setLightboxOpen(false)} />}

      {destination === "coleccion" && (
        <Card>
          <CollectionQuickForm
            recognized={recognized}
            sealedItems={sealedItems}
            collectionItems={collectionItems}
            checklists={checklists}
            cardsByChecklist={cardsByChecklist}
            initialSealedPurchaseId={stickySealedPurchaseId}
            onSubmit={async (entity) => {
              await onAddToCollection(entity);
              setStickySealedPurchaseId(entity.sealedPurchaseId);
              await handleSaved("coleccion", entity.name);
            }}
            onCancel={() => setDestination(null)}
          />
        </Card>
      )}

      {destination === "wishlist" && (
        <Card>
          <WishlistQuickForm
            recognized={recognized}
            photo={photo}
            onSubmit={async (entity) => {
              await onAddToWishlist(entity);
              await handleSaved("wishlist", entity.name);
            }}
            onCancel={() => setDestination(null)}
          />
        </Card>
      )}

      {destination === "sellado" && (
        <SealedPurchaseForm
          initialName={recognized?.name ?? undefined}
          photo={photo}
          onSubmit={async (entity) => {
            await onAddToSealed(entity);
            await handleSaved("sellado", entity.productName);
          }}
          onCancel={() => setDestination(null)}
        />
      )}
    </div>
  );
}
