import { useCallback, useEffect, useState } from "react";
import type { MoveToCollectionDetails, NewWishlistItem, WishlistItem } from "../domain/types";
import { moveWishlistItemToCollection, wishlistItemClient } from "./api";

export function useWishlistData() {
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
    reload();
  }, [reload]);

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
