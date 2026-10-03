import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'ar' | 'en';
export type Theme = 'light' | 'dark';

export interface ServerStoreSettings {
  id: string;
  storeName: string;
  storeLogo: string;
  defaultCurrency: string;
  defaultLanguage: Language;
  defaultTheme: Theme;

  lightBgPrimary: string;
  lightBgSurface: string;
  lightTextPrimary: string;
  lightTextSecondary: string;
  lightAccentColor: string;

  darkBgPrimary: string;
  darkBgSurface: string;
  darkTextPrimary: string;
  darkTextSecondary: string;
  darkAccentColor: string;

  fontFamily: string;
  fontSize: string;

  announcementEnabled: boolean;
  announcementText: string;

  contactEmail: string;
  contactPhone: string;

  socialFacebook: string;
  socialFacebookEnabled: boolean;
  socialInstagram: string;
  socialInstagramEnabled: boolean;
  socialTwitter: string;
  socialTwitterEnabled: boolean;
  socialTikTok: string;
  socialTikTokEnabled: boolean;
  socialWhatsApp: string;
  socialWhatsAppEnabled: boolean;

  maintenanceMode: boolean;
  maintenanceMessage: string;

  shippingFee: number;
  taxRate: number;

  loyaltyEnabled?: boolean;
  pointsPerDollar?: number;
  pointsRedemptionRate?: number;
  minPointsToRedeem?: number;
  lowStockThreshold?: number;
  popupEnabled?: boolean;
  popupTitle?: string;
  popupText?: string;
  popupDiscountCode?: string;

  // Courier tracking settings
  courierTrackingEnabled?: boolean;
  courierProvider?: string;
  courierTrackingUrlTemplate?: string;

  // Email notifications (Phase 5)
  emailNotificationsEnabled?: boolean;
  emailProvider?: string;
  resendApiKey?: string;
  fromEmail?: string;
  adminNotifyEmail?: string;
  notifyOnNewOrder?: boolean;
  notifyOnStatusChange?: boolean;

  // Referral Program
  referralEnabled?: boolean;
  referralRefereeDiscount?: number;
  referralReferrerPoints?: number;

  // Return / Refund Policy
  returnWindowDays?: number;

  // Automated Scheduled Backup & Retention (Phase 7)
  autoBackupEnabled?: boolean;
  autoBackupFrequency?: string; // 'daily' | 'every_3_days' | 'weekly' | 'every_12_hours'
  autoBackupScope?: string;     // 'full' | 'db_only' | 'media_only'
  autoBackupRetentionDays?: number; // default 7 (1 week)
  autoBackupTime?: string;      // e.g. "02:00"
  lastAutoBackupAt?: string | null;

  // Payment Methods & Gateway Settings
  paymentCodEnabled?: boolean;
  paymentCodExtraFee?: number;
  paymentCodInstructions?: string;
  paymentInstapayEnabled?: boolean;
  paymentInstapayAddress?: string;
  paymentInstapayPhone?: string;
  paymentInstapayInstructions?: string;
  paymentFawryEnabled?: boolean;
  paymentFawryMerchantCode?: string;
  paymentFawrySecurityKey?: string;
  paymentFawryTestMode?: boolean;
  paymentFawryInstructions?: string;
  paymentCardEnabled?: boolean;
  paymentCardGateway?: string; // stripe | paymob | fawry | tap | custom
  paymentCardPublishableKey?: string;
  paymentCardSecretKey?: string;
  paymentCardTestMode?: boolean;
  paymentCardInstructions?: string;
  paymentWalletsEnabled?: boolean;
  paymentWalletsNumber?: string;
  paymentWalletsInstructions?: string;

  // Order Deposit & Anti-Cancellation Settings
  depositEnabled?: boolean;
  depositType?: string; // 'FIXED' | 'PERCENTAGE' | 'SHIPPING_ONLY'
  depositValue?: number;
  depositAppliesTo?: string; // 'COD' | 'ALL'
  depositMinOrderTotal?: number;
  depositInstructions?: string;
  depositPolicyText?: string;
}

export const defaultStoreSettings: ServerStoreSettings = {
  id: 'default',
  storeName: 'Store',
  storeLogo: '',
  defaultCurrency: 'USD',
  defaultLanguage: 'ar',
  defaultTheme: 'light',

  lightBgPrimary: '#f8fafc',
  lightBgSurface: '#ffffff',
  lightTextPrimary: '#0f172a',
  lightTextSecondary: '#475569',
  lightAccentColor: '#6366f1',

  darkBgPrimary: '#0b0f19',
  darkBgSurface: '#111827',
  darkTextPrimary: '#ffffff',
  darkTextSecondary: '#9ca3af',
  darkAccentColor: '#6366f1',

  fontFamily: 'sans-serif',
  fontSize: 'medium',

  announcementEnabled: false,
  announcementText: '🎉 خصم مميز على جميع المنتجات!',

  contactEmail: 'support@store.com',
  contactPhone: '+20 10 0000 0000',

  socialFacebook: 'https://facebook.com',
  socialFacebookEnabled: true,
  socialInstagram: 'https://instagram.com',
  socialInstagramEnabled: true,
  socialTwitter: 'https://twitter.com',
  socialTwitterEnabled: true,
  socialTikTok: 'https://tiktok.com',
  socialTikTokEnabled: true,
  socialWhatsApp: 'https://wa.me/201000000000',
  socialWhatsAppEnabled: true,

  maintenanceMode: false,
  maintenanceMessage: 'المتجر تحت الصيانة حالياً وسنعود قريباً',

  shippingFee: 0,
  taxRate: 0,

  loyaltyEnabled: true,
  pointsPerDollar: 1.0,
  pointsRedemptionRate: 20.0,
  minPointsToRedeem: 20,
  lowStockThreshold: 10,
  popupEnabled: true,
  popupTitle: '🎉 هدية ترحيبية خاصة!',
  popupText: 'احصل على خصم 10% على أول طلب لك!',
  popupDiscountCode: 'WELCOME10',

  courierTrackingEnabled: false,
  courierProvider: 'aramex',
  courierTrackingUrlTemplate: '',

  emailNotificationsEnabled: false,
  emailProvider: 'resend',
  resendApiKey: '',
  fromEmail: 'orders@store.com',
  adminNotifyEmail: 'admin@store.com',
  notifyOnNewOrder: true,
  notifyOnStatusChange: true,

  referralEnabled: true,
  referralRefereeDiscount: 10.0,
  referralReferrerPoints: 50,
  returnWindowDays: 14,

  // Automated Scheduled Backup & Retention
  autoBackupEnabled: false,
  autoBackupFrequency: 'daily',
  autoBackupScope: 'full',
  autoBackupRetentionDays: 7,
  autoBackupTime: '02:00',
  lastAutoBackupAt: null,

  // Payment Methods & Gateway Settings
  paymentCodEnabled: true,
  paymentCodExtraFee: 0,
  paymentCodInstructions: '',
  paymentInstapayEnabled: true,
  paymentInstapayAddress: 'store@instapay',
  paymentInstapayPhone: '',
  paymentInstapayInstructions: '',
  paymentFawryEnabled: true,
  paymentFawryMerchantCode: '',
  paymentFawrySecurityKey: '',
  paymentFawryTestMode: true,
  paymentFawryInstructions: '',
  paymentCardEnabled: true,
  paymentCardGateway: 'stripe',
  paymentCardPublishableKey: '',
  paymentCardSecretKey: '',
  paymentCardTestMode: true,
  paymentCardInstructions: '',
  paymentWalletsEnabled: false,
  paymentWalletsNumber: '',
  paymentWalletsInstructions: '',

  // Order Deposit & Anti-Cancellation Settings
  depositEnabled: false,
  depositType: 'FIXED',
  depositValue: 50.0,
  depositAppliesTo: 'COD',
  depositMinOrderTotal: 0.0,
  depositInstructions: '',
  depositPolicyText: '',
};

interface SettingsStore {
  language: Language;
  theme: Theme;
  currency: string;
  hasVisited: boolean;
  hasCustomLanguage: boolean;
  hasCustomTheme: boolean;
  hasCustomCurrency: boolean;

  serverSettings: ServerStoreSettings;

  setLanguage: (lang: Language) => void;
  setTheme: (theme: Theme) => void;
  setCurrency: (currency: string) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;

  setServerSettings: (settings: Partial<ServerStoreSettings>) => void;
  fetchSettings: () => Promise<void>;
  forceStoreSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      language: 'ar',
      theme: 'light',
      currency: 'USD',
      hasVisited: false,
      hasCustomLanguage: false,
      hasCustomTheme: false,
      hasCustomCurrency: false,

      serverSettings: defaultStoreSettings,

      setLanguage: (language) => set({ language, hasCustomLanguage: true, hasVisited: true }),
      setTheme: (theme) => set({ theme, hasCustomTheme: true, hasVisited: true }),
      setCurrency: (currency) => set({ currency, hasCustomCurrency: true, hasVisited: true }),

      toggleLanguage: () => {
        const nextLang = get().language === 'ar' ? 'en' : 'ar';
        set({ language: nextLang, hasCustomLanguage: true, hasVisited: true });
      },

      toggleTheme: () => {
        const nextTheme = get().theme === 'light' ? 'dark' : 'light';
        set({ theme: nextTheme, hasCustomTheme: true, hasVisited: true });
      },

      setServerSettings: (newSettings) =>
        set((state) => ({
          serverSettings: { ...state.serverSettings, ...newSettings },
        })),

      fetchSettings: async () => {
        try {
          const res = await fetch('/api/settings');
          if (res.ok) {
            const data: ServerStoreSettings = await res.json();
            const { hasVisited, hasCustomLanguage, hasCustomTheme, hasCustomCurrency } = get();

            if (!hasVisited) {
              // First visit: force store settings and set hasVisited = true
              set({
                serverSettings: data,
                language: data.defaultLanguage || 'ar',
                theme: data.defaultTheme || 'light',
                currency: data.defaultCurrency || 'USD',
                hasVisited: true,
              });
            } else {
              // Subsequent visits: preserve user selections for theme, language, and currency
              set((state) => ({
                serverSettings: { ...state.serverSettings, ...data },
                language: hasCustomLanguage ? state.language : state.language,
                theme: hasCustomTheme ? state.theme : state.theme,
                currency: hasCustomCurrency ? state.currency : state.currency,
              }));
            }
          }
        } catch (error) {
          // Suppress error quietly in browser
        }
      },

      forceStoreSettings: async () => {
        try {
          const res = await fetch('/api/settings');
          if (res.ok) {
            const data: ServerStoreSettings = await res.json();
            set({
              serverSettings: data,
              language: data.defaultLanguage || 'ar',
              theme: data.defaultTheme || 'light',
              currency: data.defaultCurrency || 'USD',
              hasVisited: true,
              hasCustomLanguage: false,
              hasCustomTheme: false,
              hasCustomCurrency: false,
            });
          }
        } catch (error) {
          // Suppress error quietly in browser
        }
      },
    }),
    {
      name: 'auratrix-settings',
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
        currency: state.currency,
        hasVisited: state.hasVisited,
        hasCustomLanguage: state.hasCustomLanguage,
        hasCustomTheme: state.hasCustomTheme,
        hasCustomCurrency: state.hasCustomCurrency,
      }),
    }
  )
);

// SSR-safe hook that returns store settings safely
export function useSettings() {
  const store = useSettingsStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return {
      ...store,
      language: 'ar' as Language,
      theme: 'light' as Theme,
      currency: 'USD',
      serverSettings: defaultStoreSettings,
    };
  }

  return store;
}
