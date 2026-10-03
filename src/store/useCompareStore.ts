import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CompareProduct {
  id: string;
  title: string;
  description: string;
  price: number;
  discountPercent?: number;
  stockQuantity: number;
  images: string;
  averageRating?: number;
  ratingCount?: number;
  categories?: { id: string; name: string; slug: string }[];
  variants?: { id: string; colorName: string; colorHex: string; stockQuantity: number }[];
}

interface CompareState {
  items: CompareProduct[];
  addToCompare: (product: CompareProduct) => boolean;
  removeFromCompare: (productId: string) => void;
  toggleCompare: (product: CompareProduct) => { added: boolean; maxReached?: boolean };
  clearCompare: () => void;
  isInCompare: (productId: string) => boolean;
}

const MAX_COMPARE_ITEMS = 4;

export const useCompareStore = create<CompareState>()(
  persist(
    (set, get) => ({
      items: [],

      addToCompare: (product) => {
        const { items } = get();
        if (items.some((item) => item.id === product.id)) {
          return false; // Already in list
        }
        if (items.length >= MAX_COMPARE_ITEMS) {
          return false; // Max limit reached
        }
        set({ items: [...items, product] });
        return true;
      },

      removeFromCompare: (productId) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        }));
      },

      toggleCompare: (product) => {
        const { items } = get();
        const exists = items.some((item) => item.id === product.id);

        if (exists) {
          set({ items: items.filter((item) => item.id !== product.id) });
          return { added: false };
        }

        if (items.length >= MAX_COMPARE_ITEMS) {
          return { added: false, maxReached: true };
        }

        set({ items: [...items, product] });
        return { added: true };
      },

      clearCompare: () => {
        set({ items: [] });
      },

      isInCompare: (productId) => {
        return get().items.some((item) => item.id === productId);
      },
    }),
    {
      name: 'auratrix-compare-store',
    }
  )
);
