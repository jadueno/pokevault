import type {
  CollectionItem,
  MoveToCollectionDetails,
  NewCollectionItem,
  NewPlanItem,
  NewSealedPurchase,
  NewWishlistItem,
  PlanItem,
  PlanSettings,
  SealedPurchase,
  SetChecklist,
  SetChecklistCard,
  SetSearchCandidate,
  WishlistItem,
} from "../domain/types";

// Usa el mismo host desde el que se cargó la página (localhost, IP de LAN o de
// Tailscale) en vez de "localhost" fijo, que en el móvil apuntaría al propio móvil
// y no al Mac que sirve el backend.
export const API_URL = import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:3004`;

// Solo se envía si el backend tiene API_TOKEN activado; vacío por defecto, así que el
// uso personal habitual no cambia.
const API_TOKEN = import.meta.env.VITE_API_TOKEN;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Error ${res.status} en ${path}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** Cliente CRUD genérico para un recurso REST estándar (GET/POST/PUT/DELETE). */
export function createCrudClient<T, TNew>(path: string) {
  return {
    list: () => request<T[]>(path),
    create: (entity: TNew) => request<T>(path, { method: "POST", body: JSON.stringify(entity) }),
    update: (id: string, entity: TNew) => request<T>(`${path}/${id}`, { method: "PUT", body: JSON.stringify(entity) }),
    remove: (id: string) => request<void>(`${path}/${id}`, { method: "DELETE" }),
  };
}

// ---- Colección ----

export const collectionItemClient = createCrudClient<CollectionItem, NewCollectionItem>("/collection-items");

export function getCollectionSummary<T>(): Promise<T> {
  return request("/collection-items/summary");
}

export function overrideCollectionItemValue<T>(id: string, value: number, note: string | null): Promise<T> {
  return request(`/collection-items/${id}/estimated-value`, { method: "PUT", body: JSON.stringify({ value, note }) });
}

// ---- Wishlist ----

export const wishlistItemClient = createCrudClient<WishlistItem, NewWishlistItem>("/wishlist-items");

export function moveWishlistItemToCollection<T>(id: string, details: MoveToCollectionDetails): Promise<T> {
  return request(`/wishlist-items/${id}/move-to-collection`, { method: "POST", body: JSON.stringify(details) });
}

// ---- Producto sellado ----

export const sealedPurchaseClient = createCrudClient<SealedPurchase, NewSealedPurchase>("/sealed-purchases");

export function overrideSealedPurchaseValue<T>(id: string, value: number, note: string | null): Promise<T> {
  return request(`/sealed-purchases/${id}/estimated-value`, { method: "PUT", body: JSON.stringify({ value, note }) });
}

// ---- Plan de compra mensual ----

export const planItemClient = createCrudClient<PlanItem, NewPlanItem>("/plan-items");

export function togglePlanItemDone<T>(id: string): Promise<T> {
  return request(`/plan-items/${id}/toggle-done`, { method: "POST" });
}

export function getPlanSettings<T>(): Promise<T> {
  return request("/plan-settings");
}

export function updatePlanSettings<T>(entity: PlanSettings): Promise<T> {
  return request("/plan-settings", { method: "PUT", body: JSON.stringify(entity) });
}

// ---- Checklist de set (búsqueda + sincronización explícita, nunca en segundo plano) ----

export function getSetChecklists<T = SetChecklist[]>(): Promise<T> {
  return request("/set-checklists");
}

export function getSetChecklistCards<T = SetChecklistCard[]>(checklistId: string): Promise<T> {
  return request(`/set-checklists/${checklistId}/cards`);
}

export function searchSets<T = SetSearchCandidate[]>(query: string): Promise<T> {
  return request(`/set-search?q=${encodeURIComponent(query)}`);
}

export function createSetChecklist<T = SetChecklist>(externalSetId: string, setNameEs: string | null): Promise<T> {
  return request("/set-checklists", { method: "POST", body: JSON.stringify({ externalSetId, setNameEs }) });
}

export function resyncSetChecklist<T = SetChecklist>(checklistId: string): Promise<T> {
  return request(`/set-checklists/${checklistId}/resync`, { method: "POST" });
}
