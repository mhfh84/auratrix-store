import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useHydrated } from '@/hooks/useHydrated';

export interface CartItem {
  id: string; // Product ID
  title: string;
  price: number;
  image: string;
  stockQuantity: number;
  quantity: number;
  variantId?: string;      // Color variant ID (if product has color variants)
  selectedColor?: string;  // Color name displayed in cart / checkout
  priceStale?: boolean;    // true when server returned a different price
  outOfStock?: boolean;    // true when server says item is unavailable
}

export interface GuestInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
  state: string;  // Governorate
  city: string;   // City / Area
}

interface CartValidationResult {
  staleItems: string[];   // product IDs whose price changed
  unavailableItems: string[]; // product IDs that are now out of stock
}

interface CartStore {
  items: CartItem[];
  guestInfo: GuestInfo;
  isCartDrawerOpen: boolean;
  isMobileMenuOpen: boolean;
  lastValidatedAt: number | null;

  // Actions
  addItem: (item: Omit<CartItem, 'quantity'>, qty?: number) => boolean;
  removeItem: (id: string, variantId?: string) => void;
  updateQuantity: (id: string, quantity: number, variantId?: string) => void;
  clearCart: () => void;
  resetStore: () => void;
  setGuestInfo: (info: Partial<GuestInfo>) => void;
  toggleCartDrawer: (open?: boolean) => void;
  toggleMobileMenu: (open?: boolean) => void;
  validateCart: () => Promise<CartValidationResult>;

  // Computed
  getTotalAmount: () => number;
  getTotalItems: () => number;
}

// Cart items are keyed by productId + variantId (or just productId if no variant)
function cartKey(id: string, variantId?: string) {
  return variantId ? `${id}__${variantId}` : id;
}

const EMPTY_GUEST: GuestInfo = { name: '', email: '', phone: '', address: '', state: '', city: '' };

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      guestInfo: EMPTY_GUEST,
      isCartDrawerOpen: false,
      isMobileMenuOpen: false,
      lastValidatedAt: null,

      addItem: (product, qty = 1) => {
        const currentItems = get().items;
        const key = cartKey(product.id, product.variantId);
        const existingIndex = currentItems.findIndex(
          (item) => cartKey(item.id, item.variantId) === key
        );

        if (existingIndex > -1) {
          const existingItem = currentItems[existingIndex];
          const newQty = existingItem.quantity + qty;
          
          if (newQty > product.stockQuantity) {
            return false; // Exceeds stock
          }

          const updatedItems = [...currentItems];
          updatedItems[existingIndex] = {
            ...existingItem,
            quantity: newQty,
          };
          set({ items: updatedItems, isCartDrawerOpen: true });
          return true;
        } else {
          if (qty > product.stockQuantity) {
            return false;
          }
          set({
            items: [
              ...currentItems,
              {
                id: product.id,
                title: product.title,
                price: product.price,
                image: product.image,
                stockQuantity: product.stockQuantity,
                quantity: qty,
                variantId: product.variantId,
                selectedColor: product.selectedColor,
              },
            ],
            isCartDrawerOpen: true,
          });
          return true;
        }
      },

      removeItem: (id, variantId) => {
        const key = cartKey(id, variantId);
        set({ items: get().items.filter((item) => cartKey(item.id, item.variantId) !== key) });
      },

      updateQuantity: (id, quantity, variantId) => {
        const key = cartKey(id, variantId);
        if (quantity <= 0) {
          get().removeItem(id, variantId);
          return;
        }
        set({
          items: get().items.map((item) =>
            cartKey(item.id, item.variantId) === key
              ? { ...item, quantity: Math.min(quantity, item.stockQuantity) }
              : item
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      resetStore: () => {
        set({ items: [], guestInfo: EMPTY_GUEST });
      },

      setGuestInfo: (info) => {
        set({ guestInfo: { ...get().guestInfo, ...info } });
      },

      toggleCartDrawer: (open) => {
        set({ isCartDrawerOpen: open !== undefined ? open : !get().isCartDrawerOpen });
      },

      toggleMobileMenu: (open) => {
        set({ isMobileMenuOpen: open !== undefined ? open : !get().isMobileMenuOpen });
      },

      validateCart: async () => {
        const currentItems = get().items;
        if (currentItems.length === 0) return { staleItems: [], unavailableItems: [] };

        // Throttle: skip if validated within the last 60 seconds
        const lastValidated = get().lastValidatedAt;
        if (lastValidated && Date.now() - lastValidated < 60_000) {
          return { staleItems: [], unavailableItems: [] };
        }

        try {
          const res = await fetch('/api/cart/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: currentItems.map((i) => ({
                id: i.id,
                variantId: i.variantId ?? null,
                quantity: i.quantity,
              })),
            }),
          });

          if (!res.ok) return { staleItems: [], unavailableItems: [] };

          const data = await res.json();
          const validated: any[] = data.items ?? [];

          const staleItems: string[] = [];
          const unavailableItems: string[] = [];

          const updatedItems = currentItems.map((cartItem) => {
            const serverItem = validated.find(
              (v) =>
                v.id === cartItem.id &&
                (v.variantId ?? null) === (cartItem.variantId ?? null)
            );

            if (!serverItem || !serverItem.available) {
              unavailableItems.push(cartItem.id);
              return { ...cartItem, outOfStock: true, priceStale: false };
            }

            // Round to 2 decimal places before comparing
            const roundedServerPrice = Math.round(serverItem.currentPrice * 100) / 100;
            const roundedCartPrice = Math.round(cartItem.price * 100) / 100;
            const priceChanged = Math.abs(roundedServerPrice - roundedCartPrice) > 0.01;

            if (priceChanged) staleItems.push(cartItem.id);

            return {
              ...cartItem,
              price: serverItem.currentPrice,
              stockQuantity: serverItem.stockQuantity,
              priceStale: priceChanged,
              outOfStock: !serverItem.available,
            };
          });

          set({ items: updatedItems, lastValidatedAt: Date.now() });
          return { staleItems, unavailableItems };
        } catch {
          return { staleItems: [], unavailableItems: [] };
        }
      },

      getTotalAmount: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'auratrix-cart-storage',
      partialize: (state) => ({ items: state.items, guestInfo: state.guestInfo }),
    }
  )
);

// SSR-safe cart hook
export function useCart() {
  const store = useCartStore();
  const hydrated = useHydrated();

  if (!hydrated) {
    return {
      ...store,
      items: [],
      guestInfo: EMPTY_GUEST,
      getTotalItems: () => 0,
      getTotalAmount: () => 0,
    };
  }

  return store;
}
