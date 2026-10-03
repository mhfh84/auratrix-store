/**
 * rateLimit.ts
 * -----------
 * Zero-dependency, in-memory rate limiter using a fixed window algorithm.
 * Works in Next.js App Router without any external services (no Redis required).
 *
 * Because Next.js runs in a long-lived Node.js process in dev/production,
 * the in-memory Map persists between requests inside the same process.
 *
 * Usage:
 *   const result = checkRateLimit(`login:${ip}`, { limit: 10, windowMs: 60_000 });
 *   if (!result.success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

interface WindowEntry {
  count: number;
  resetAt: number; // epoch ms when the window expires
}

// Global store — lives for the duration of the Node.js process
const store = new Map<string, WindowEntry>();

// Sweep expired entries every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}, 5 * 60_000).unref(); // .unref() so the timer never prevents process exit

export interface RateLimitOptions {
  /** Maximum number of requests allowed per window */
  limit: number;
  /** Window duration in milliseconds */
  windowMs: number;
}

export interface RateLimitResult {
  /** true = request is allowed; false = rate limit exceeded */
  success: boolean;
  /** How many requests remain in the current window */
  remaining: number;
  /** When the current window resets (epoch ms) */
  resetAt: number;
}

/**
 * Check whether `identifier` has exceeded its rate limit.
 * Call this at the top of any API handler.
 *
 * @param identifier - A unique string key, e.g. `"login:192.168.1.1"` or `"register:10.0.0.5"`
 * @param options    - { limit, windowMs }
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  let entry = store.get(identifier);

  if (!entry || entry.resetAt <= now) {
    // Start a fresh window
    entry = { count: 0, resetAt: now + options.windowMs };
    store.set(identifier, entry);
  }

  entry.count += 1;

  const remaining = Math.max(0, options.limit - entry.count);
  const success = entry.count <= options.limit;

  return { success, remaining, resetAt: entry.resetAt };
}

/**
 * Extract the real client IP from Next.js App Router request headers.
 * Respects X-Forwarded-For (set by proxies/Vercel/Nginx) with a fallback.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * Build a standard 429 Too Many Requests response with Retry-After header.
 */
export function rateLimitResponse(resetAt: number): Response {
  const retryAfterSeconds = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please try again later.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSeconds),
        'X-RateLimit-Reset': String(Math.ceil(resetAt / 1000)),
      },
    },
  );
}
