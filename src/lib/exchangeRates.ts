/**
 * exchangeRates.ts
 * ────────────────
 * Dynamic currency rates with 1-hour in-memory cache and resilient fallbacks.
 */

let cachedRates: Record<string, number> | null = null;
let lastFetchedAt: number = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 Hour

export const FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  SAR: 3.75,
  AED: 3.67,
  EUR: 0.92,
  GBP: 0.78,
  EGP: 48.5,
  KWD: 0.31,
  QAR: 3.64,
};

export async function getLiveExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedRates && now - lastFetchedAt < CACHE_TTL_MS) {
    return cachedRates;
  }

  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', {
      next: { revalidate: 3600 },
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates) {
        const rates: Record<string, number> = { ...FALLBACK_RATES, ...data.rates };
        cachedRates = rates;
        lastFetchedAt = now;
        return rates;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch live exchange rates, using fallbacks:', error);
  }

  return cachedRates || FALLBACK_RATES;
}

export function convertAmount(
  amount: number,
  fromCode: string,
  toCode: string,
  rates: Record<string, number> = FALLBACK_RATES
): number {
  if (fromCode === toCode) return amount;
  const fromRate = rates[fromCode] || 1;
  const toRate = rates[toCode] || 1;

  // Convert to USD base first, then to target currency
  const inUSD = amount / fromRate;
  return inUSD * toRate;
}
