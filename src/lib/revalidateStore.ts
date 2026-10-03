import { revalidatePath } from 'next/cache';

/**
 * revalidateStorePages
 * --------------------
 * Immediately invalidates the ISR cache for all customer-facing pages
 * that display products or categories.
 *
 * Call this from any API route that mutates products, categories, or
 * stock levels. It runs synchronously within the route handler, so
 * the very next page load after a mutation will fetch fresh data from
 * the database instead of serving the cached HTML.
 *
 * Combined with the SSE realtime system (useRealtimeSync), this gives us:
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  • Existing visitors  → instant update via SSE + client refetch    │
 * │  • New visitors       → instant update via busted ISR cache        │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * @param scope  'products'   – only product-related pages
 *               'categories' – only category nav
 *               'all'        – all storefront pages (used after bulk ops)
 */
export function revalidateStorePages(scope: 'products' | 'categories' | 'all' = 'all') {
  try {
    if (scope === 'products' || scope === 'all') {
      revalidatePath('/');             // Home page (new arrivals, best sellers, hero)
      revalidatePath('/products');     // All-products listing
      revalidatePath('/deals');        // Deals page (sale items)
      revalidatePath('/product', 'page'); // Individual product pages
    }
    if (scope === 'categories' || scope === 'all') {
      revalidatePath('/');             // Home page category nav
      revalidatePath('/products');     // Category filter sidebar
    }
  } catch (e) {
    // revalidatePath throws in non-Next.js contexts (tests, scripts) — safe to ignore
    console.warn('[revalidateStorePages] revalidatePath failed (non-Next context?):', e);
  }
}
