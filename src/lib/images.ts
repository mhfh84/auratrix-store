/**
 * Safely extracts a clean image URL string from any input,
 * handling single URLs, stringified JSON arrays, double-nested JSON, or arrays.
 * Returns the FIRST valid image URL found.
 */
export function getImageUrl(
  imagesInput: any,
  fallback = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80'
): string {
  const all = getAllImageUrls(imagesInput);
  return all.length > 0 ? all[0] : fallback;
}

/**
 * Extracts ALL valid image URLs from any input format —
 * single URL string, JSON stringified array, or raw array.
 */
export function getAllImageUrls(imagesInput: any): string[] {
  if (!imagesInput) return [];

  const resolved: string[] = [];

  function extractFrom(value: any, depth = 0) {
    if (depth > 5) return;

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return;

      if (
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://') ||
        trimmed.startsWith('/') ||
        trimmed.startsWith('data:image/')
      ) {
        resolved.push(trimmed);
        return;
      }

      if (
        (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        try {
          extractFrom(JSON.parse(trimmed), depth + 1);
        } catch {
          resolved.push(trimmed);
        }
      } else {
        resolved.push(trimmed);
      }
    } else if (Array.isArray(value)) {
      value.forEach((item) => extractFrom(item, depth + 1));
    }
  }

  extractFrom(imagesInput);
  return resolved;
}

/**
 * Accepts a string[] of image URLs (or data URLs) and serializes to a
 * JSON array string for storage in the database `images` column.
 */
export function cleanImageArrayInput(urls: string[]): string {
  const valid = urls
    .map((u) => u.trim())
    .filter(
      (u) =>
        u.startsWith('http://') ||
        u.startsWith('https://') ||
        u.startsWith('/') ||
        u.startsWith('data:image/')
    );
  return JSON.stringify(valid.length > 0 ? valid : []);
}

/**
 * Legacy single-image helper — kept for backwards compat.
 */
export function cleanImageInput(inputUrl: string): string {
  const url = getImageUrl(inputUrl);
  return JSON.stringify([url]);
}
