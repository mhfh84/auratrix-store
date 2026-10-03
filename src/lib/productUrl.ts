/**
 * Generates an SEO and user-friendly URL for a product using its name/title.
 * Falls back to product ID if title is not present.
 */
export function getProductUrl(
  product: { id?: string; title?: string } | string | null | undefined
): string {
  if (!product) return '/products';
  if (typeof product === 'string') {
    return `/product/${encodeURIComponent(product.trim())}`;
  }
  const name = product.title?.trim() || product.id?.trim() || '';
  if (!name) return '/products';
  return `/product/${encodeURIComponent(name)}`;
}
