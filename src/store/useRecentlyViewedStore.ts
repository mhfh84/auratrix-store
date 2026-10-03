import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface RecentlyViewedItem {
  id: string;
  title: string;
  price: number;
  discountPercent?: number;
  stockQuantity: number;
  images: string;
  averageRating?: number;
  ratingCount?: number;
  categories?: { id: string; name: string; slug: string }[];
  viewedAt: number;
}

interface RecentlyViewedState {
  items: RecentlyViewedItem[];
  addProduct: (product: Omit<RecentlyViewedItem, 'viewedAt'>) => void;
  clearRecentlyViewed: () => void;
}

const MAX_RECENTLY_VIEWED = 12;

export const useRecentlyViewedStore = create<RecentlyViewedState>()(
  persist(
    (set, get) => ({
      items: [],

      addProduct: (product) => {
        const currentItems = get().items;
        // Filter out existing occurrence if already in list
        const filtered = currentItems.filter((item) => item.id !== product.id);

        const newItem: RecentlyViewedItem = {
          ...product,
          viewedAt: Date.now(),
        };

        // Add to beginning, cap at MAX_RECENTLY_VIEWED
        set({
          items: [newItem, ...filtered].slice(0, MAX_RECENTLY_VIEWED),
        });
      },

      clearRecentlyViewed: () => {
        set({ items: [] });
      },
    }),
    {
      name: 'auratrix-recently-viewed',
    }
  )
);
