import type {
  CollectionItem,
  NewCollectionItem,
  NewPlanItem,
  NewSealedPurchase,
  NewWishlistItem,
  PlanItem,
  PlanSettings,
  RecognizedCardData,
  SealedPurchase,
  WishlistItem,
} from "./types.js";

export interface Repository<T, TNew> {
  list(): Promise<T[]>;
  create(entity: TNew): Promise<T>;
  update(id: string, entity: TNew): Promise<T | null>;
  remove(id: string): Promise<boolean>;
}

export type SealedPurchaseRepository = Repository<SealedPurchase, NewSealedPurchase>;
export type CollectionItemRepository = Repository<CollectionItem, NewCollectionItem>;
export type WishlistItemRepository = Repository<WishlistItem, NewWishlistItem>;
export type PlanItemRepository = Repository<PlanItem, NewPlanItem>;

export interface PlanSettingsRepository {
  get(): Promise<PlanSettings>;
  update(entity: PlanSettings): Promise<PlanSettings>;
}

// ---- Reconocimiento visual (puerto intercambiable) ----
// El dominio/aplicación nunca depende de un modelo de IA concreto — solo de esta forma.
// Mismo patrón que el proveedor de LLM/embeddings de "nous": adaptador real (Ollama
// local, ver infrastructure/vision/ollamaVisionProvider.ts) + fake determinista para
// tests. El resultado nunca se guarda automáticamente: siempre se revisa/edita a mano.

export interface VisualMatchProvider {
  readonly name: string;
  recognizeCard(imageDataUrl: string): Promise<RecognizedCardData>;
}
