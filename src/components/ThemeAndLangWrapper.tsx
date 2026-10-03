'use client';

import { useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';

const FONT_URLS: Record<string, string> = {
  tajawal: 'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;900&display=swap',
  cairo: 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap',
  inter: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap',
  outfit: 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;900&display=swap',
};

const FONT_FAMILIES: Record<string, string> = {
  system: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  tajawal: "'Tajawal', sans-serif",
  cairo: "'Cairo', sans-serif",
  inter: "'Inter', sans-serif",
  outfit: "'Outfit', sans-serif",
};

export default function ThemeAndLangWrapper() {
  const { theme, language, serverSettings, fetchSettings } = useSettingsStore();

  // Initial fetch on mount & set up real-time update listeners
  useEffect(() => {
    fetchSettings();

    // BroadcastChannel listener for multi-tab real-time updates
    let channel1: BroadcastChannel | null = null;
    let channel2: BroadcastChannel | null = null;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        channel1 = new BroadcastChannel('auratrix-settings-sync');
        channel1.onmessage = (event) => {
          if (event.data?.settings) {
            useSettingsStore.getState().setServerSettings(event.data.settings);
          } else {
            fetchSettings();
          }
        };

        channel2 = new BroadcastChannel('auratrix-settings');
        channel2.onmessage = () => {
          fetchSettings();
        };
      } catch (e) {
        // BroadcastChannel fallback
      }
    }

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        useSettingsStore.getState().setServerSettings(customEvent.detail);
      } else {
        fetchSettings();
      }
    };
    window.addEventListener('auratrix-settings-updated', handleCustomEvent);

    return () => {
      if (channel1) channel1.close();
      if (channel2) channel2.close();
      window.removeEventListener('auratrix-settings-updated', handleCustomEvent);
    };
  }, [fetchSettings]);

  // Apply theme classes, custom CSS variables, fonts, and language
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const html = document.documentElement;

    // Apply language direction and attribute
    html.setAttribute('lang', language);
    html.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');

    // Theme Mode & Dynamic Colors
    const isDark = theme === 'dark';
    if (isDark) {
      html.classList.add('dark');
      const darkBg = serverSettings.darkBgPrimary || '#0b0f19';
      const darkSurface = serverSettings.darkBgSurface || '#111827';
      const darkTextPri = serverSettings.darkTextPrimary || '#ffffff';
      const darkTextSec = serverSettings.darkTextSecondary || '#9ca3af';
      const darkAccent = serverSettings.darkAccentColor || '#6366f1';

      html.style.setProperty('--bg-primary', darkBg);
      html.style.setProperty('--bg-surface', darkSurface);
      html.style.setProperty('--bg-card', darkSurface);
      html.style.setProperty('--glass-card-bg', darkSurface);
      html.style.setProperty('--glass-bg', darkSurface);
      html.style.setProperty('--text-primary', darkTextPri);
      html.style.setProperty('--text-secondary', darkTextSec);
      html.style.setProperty('--border-focus', darkAccent);
      html.style.setProperty('--accent-color', darkAccent);
    } else {
      html.classList.remove('dark');
      const lightBg = serverSettings.lightBgPrimary || '#f8fafc';
      const lightSurface = serverSettings.lightBgSurface || '#ffffff';
      const lightTextPri = serverSettings.lightTextPrimary || '#0f172a';
      const lightTextSec = serverSettings.lightTextSecondary || '#475569';
      const lightAccent = serverSettings.lightAccentColor || '#6366f1';

      html.style.setProperty('--bg-primary', lightBg);
      html.style.setProperty('--bg-surface', lightSurface);
      html.style.setProperty('--bg-card', lightSurface);
      html.style.setProperty('--glass-card-bg', lightSurface);
      html.style.setProperty('--glass-bg', lightSurface);
      html.style.setProperty('--text-primary', lightTextPri);
      html.style.setProperty('--text-secondary', lightTextSec);
      html.style.setProperty('--border-focus', lightAccent);
      html.style.setProperty('--accent-color', lightAccent);
    }

    // Font Family Injection
    const fontKey = serverSettings.fontFamily || 'system';
    if (FONT_URLS[fontKey]) {
      const linkId = `google-font-${fontKey}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = FONT_URLS[fontKey];
        document.head.appendChild(link);
      }
    }
    const fontVal = FONT_FAMILIES[fontKey] || FONT_FAMILIES.system;
    document.body.style.fontFamily = fontVal;

    // Font Size Scaling
    if (serverSettings.fontSize === 'small') {
      html.style.fontSize = '14px';
    } else if (serverSettings.fontSize === 'large') {
      html.style.fontSize = '18px';
    } else {
      html.style.fontSize = '16px';
    }

    // Dynamic page title from store name
    if (serverSettings.storeName) {
      document.title = serverSettings.storeName;
    }

    // Dynamic favicon from store logo
    if (serverSettings.storeLogo) {
      let favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!favicon) {
        favicon = document.createElement('link');
        favicon.rel = 'icon';
        document.head.appendChild(favicon);
      }
      favicon.href = serverSettings.storeLogo;
    }
  }, [theme, language, serverSettings]);

  return null;
}
