'use client';

import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  discountPercent?: number;
  image: string;
  stockQuantity: number;
}

interface WishlistStore {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (id: string) => void;
  isInWishlist: (id: string) => boolean;
  toggleWishlist: (item: WishlistItem) => boolean; // returns true if added, false if removed
  clearWishlist: () => void;
  getTotalItems: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const current = get().items;
        if (!current.some((i) => i.id === item.id)) {
          set({ items: [...current, item] });
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((i) => i.id !== id) });
      },

      isInWishlist: (id) => {
        return get().items.some((i) => i.id === id);
      },

      toggleWishlist: (item) => {
        const current = get().items;
        const exists = current.some((i) => i.id === item.id);
        if (exists) {
          set({ items: current.filter((i) => i.id !== item.id) });
          return false;
        } else {
          set({ items: [...current, item] });
          return true;
        }
      },

      clearWishlist: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        return get().items.length;
      },
    }),
    {
      name: 'auratrix-wishlist-storage',
    }
  )
);

// SSR-safe hook
export function useWishlist() {
  const store = useWishlistStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return {
      ...store,
      items: [],
      isInWishlist: () => false,
      getTotalItems: () => 0,
    };
  }

  return store;
}
