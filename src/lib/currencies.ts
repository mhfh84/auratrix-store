export interface CurrencyInfo {
  code: string;
  symbol: string;
  symbolAr: string;
  name: string;
  nameAr: string;
  rate: number; // Rate relative to USD base (1.0)
}

export const currencies: Record<string, CurrencyInfo> = {
  USD: { code: 'USD', symbol: '$', symbolAr: '$', name: 'US Dollar', nameAr: 'دولار أمريكي', rate: 1.0 },
  SAR: { code: 'SAR', symbol: 'SAR', symbolAr: 'ر.س', name: 'Saudi Riyal', nameAr: 'ريال سعودي', rate: 3.75 },
  AED: { code: 'AED', symbol: 'AED', symbolAr: 'د.إ', name: 'UAE Dirham', nameAr: 'درهم إماراتي', rate: 3.67 },
  EUR: { code: 'EUR', symbol: '€', symbolAr: '€', name: 'Euro', nameAr: 'يورو', rate: 0.92 },
  GBP: { code: 'GBP', symbol: '£', symbolAr: '£', name: 'British Pound', nameAr: 'جنيه إسترليني', rate: 0.78 },
  EGP: { code: 'EGP', symbol: 'EGP', symbolAr: 'ج.م', name: 'Egyptian Pound', nameAr: 'جنيه مصري', rate: 48.5 },
};

export type CurrencyCode = keyof typeof currencies;

export function formatPrice(
  amount: number,
  currencyCode: string = 'USD',
  language: 'ar' | 'en' = 'ar'
): string {
  const curr = currencies[currencyCode] || currencies.USD;
  const val = Number.isNaN(amount) || amount === undefined || amount === null ? 0 : amount;
  const formatted = val.toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const symbol = language === 'ar' ? curr.symbolAr : curr.symbol;

  if (language === 'ar') {
    return `${formatted} ${symbol}`;
  }
  return `${symbol}\u00A0${formatted}`;
}
