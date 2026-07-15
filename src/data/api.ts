import type {
  CardSearchFilters,
  MoveToCollectionDetails,
  NewCollectionItem,
  NewSealedPurchase,
  NewWishlistItem,
  SealedPurchase,
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

/** Cliente CRUD genérico para un recurso REST estándar (GET/POST/PUT/DELETE), donde la
 * forma de list()/create()/update() es la misma — no vale para collection-items ni
 * wishlist-items, cuyo list() devuelve la carta de catálogo ya unida (forma distinta). */
export function createCrudClient<T, TNew>(path: string) {
  return {
    list: () => request<T[]>(path),
    create: (entity: TNew) => request<T>(path, { method: "POST", body: JSON.stringify(entity) }),
    update: (id: string, entity: TNew) => request<T>(`${path}/${id}`, { method: "PUT", body: JSON.stringify(entity) }),
    remove: (id: string) => request<void>(`${path}/${id}`, { method: "DELETE" }),
  };
}

// ---- Catálogo (solo lectura: la búsqueda del usuario nunca llama al proveedor externo,
// solo lee la caché ya sincronizada) ----

export function listCatalogSets<T>(): Promise<T> {
  return request("/catalog/sets");
}

export function searchCatalogCards<T>(filters: CardSearchFilters): Promise<T> {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.setId) params.set("setId", filters.setId);
  if (filters.rarity) params.set("rarity", filters.rarity);
  if (filters.page) params.set("page", String(filters.page));
  const query = params.toString();
  return request(`/catalog/cards${query ? `?${query}` : ""}`);
}

export function getCatalogCard<T>(id: string): Promise<T> {
  return request(`/catalog/cards/${id}`);
}

// ---- Colección ----

export function listCollectionItems<T>(): Promise<T> {
  return request("/collection-items");
}

export function createCollectionItem<T>(entity: NewCollectionItem): Promise<T> {
  return request("/collection-items", { method: "POST", body: JSON.stringify(entity) });
}

export function updateCollectionItem<T>(id: string, entity: NewCollectionItem): Promise<T> {
  return request(`/collection-items/${id}`, { method: "PUT", body: JSON.stringify(entity) });
}

export function removeCollectionItem(id: string): Promise<void> {
  return request(`/collection-items/${id}`, { method: "DELETE" });
}

export function getCollectionSummary<T>(): Promise<T> {
  return request("/collection-items/summary");
}

export function overrideCollectionItemValue<T>(id: string, value: number, note: string | null): Promise<T> {
  return request(`/collection-items/${id}/estimated-value`, { method: "PUT", body: JSON.stringify({ value, note }) });
}

// ---- Wishlist ----

export function listWishlistItems<T>(): Promise<T> {
  return request("/wishlist-items");
}

export function createWishlistItem<T>(entity: NewWishlistItem): Promise<T> {
  return request("/wishlist-items", { method: "POST", body: JSON.stringify(entity) });
}

export function updateWishlistItem<T>(id: string, entity: NewWishlistItem): Promise<T> {
  return request(`/wishlist-items/${id}`, { method: "PUT", body: JSON.stringify(entity) });
}

export function removeWishlistItem(id: string): Promise<void> {
  return request(`/wishlist-items/${id}`, { method: "DELETE" });
}

export function moveWishlistItemToCollection<T>(id: string, details: MoveToCollectionDetails): Promise<T> {
  return request(`/wishlist-items/${id}/move-to-collection`, { method: "POST", body: JSON.stringify(details) });
}

// ---- Producto sellado ----

export const sealedPurchaseClient = createCrudClient<SealedPurchase, NewSealedPurchase>("/sealed-purchases");

export function overrideSealedPurchaseValue<T>(id: string, value: number, note: string | null): Promise<T> {
  return request(`/sealed-purchases/${id}/estimated-value`, { method: "PUT", body: JSON.stringify({ value, note }) });
}
