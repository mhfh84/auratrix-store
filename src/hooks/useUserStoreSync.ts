'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';

/**
 * Watches the NextAuth session and clears cart + wishlist whenever
 * the logged-in user changes (logout or account switch).
 *
 * This prevents User B from inheriting User A's cart/wishlist when
 * they log in on the same browser.
 */
export function useUserStoreSync() {
  const { data: session, status } = useSession();
  const resetCart = useCartStore((s) => s.resetStore);
  const clearWishlist = useWishlistStore((s) => s.clearWishlist);

  // Track the last known userId so we can detect a change
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // While loading, do nothing
    if (status === 'loading') return;

    const currentUserId = (session?.user as any)?.id ?? null;

    // undefined means "not yet initialized" – set baseline without clearing
    if (prevUserIdRef.current === undefined) {
      prevUserIdRef.current = currentUserId;
      return;
    }

    // If the userId has changed (includes logout: prev had id, now null)
    if (prevUserIdRef.current !== currentUserId) {
      // Clear both stores
      resetCart();
      clearWishlist();

      // Also nuke the persisted localStorage entries for both stores
      try {
        localStorage.removeItem('auratrix-cart-storage');
        localStorage.removeItem('auratrix-wishlist-storage');
      } catch {
        // localStorage may not be available in some environments
      }

      prevUserIdRef.current = currentUserId;
    }
  }, [session, status, resetCart, clearWishlist]);
}
