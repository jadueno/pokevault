import { useCallback, useEffect, useState } from "react";
import type { MoveToCollectionDetails, NewWishlistItem, WishlistItemWithCard } from "../domain/types";
import {
  createWishlistItem,
  listWishlistItems,
  moveWishlistItemToCollection,
  removeWishlistItem,
  updateWishlistItem,
} from "./api";

export function useWishlistData() {
  const [items, setItems] = useState<WishlistItemWithCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listWishlistItems<WishlistItemWithCard[]>());
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
      await createWishlistItem(entity);
      await reload();
    },
    updateItem: async (id: string, entity: NewWishlistItem) => {
      await updateWishlistItem(id, entity);
      await reload();
    },
    removeItem: async (id: string) => {
      await removeWishlistItem(id);
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
