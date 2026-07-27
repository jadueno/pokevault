import { useCallback, useEffect, useState } from "react";
import type { MoveToCollectionDetails, NewWishlistItem, WishlistItem } from "../domain/types";
import { moveWishlistItemToCollection, wishlistItemClient } from "./api";

/** `enabled`: en false no dispara ninguna petición — ver useCollectionData. */
export function useWishlistData(enabled = true) {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await wishlistItemClient.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error cargando la wishlist");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) reload();
  }, [enabled, reload]);

  return {
    items,
    loading,
    error,
    reload,
    addItem: async (entity: NewWishlistItem) => {
      await wishlistItemClient.create(entity);
      await reload();
    },
    updateItem: async (id: string, entity: NewWishlistItem) => {
      await wishlistItemClient.update(id, entity);
      await reload();
    },
    removeItem: async (id: string) => {
      await wishlistItemClient.remove(id);
      // Quita el ítem de la lista de inmediato en vez de esperar solo al reload: si el
      // reload falla o se retrasa (p. ej. por el rate-limit si hay varias pestañas
      // abiertas), el ítem ya borrado en el backend no se queda visible por error.
      setItems((prev) => prev.filter((i) => i.id !== id));
      await reload();
    },
    /** Registra la compra en la colección y quita el elemento de la wishlist —
     * quien necesite ver la colección actualizada (dashboard, etc.) recarga aparte. */
    moveToCollection: async (id: string, details: MoveToCollectionDetails) => {
      await moveWishlistItemToCollection(id, details);
      await reload();
    },
  };
}
