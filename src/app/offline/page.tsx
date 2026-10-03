'use client';

import React from 'react';
import Link from 'next/link';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWifi, faRotateRight, faHouse, faBagShopping } from '@fortawesome/free-solid-svg-icons';

export default function OfflinePage() {
  const { language } = useSettings();
  const t = translations[language].pwa;

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full glass-panel p-8 sm:p-10 rounded-3xl border theme-border shadow-2xl text-center space-y-6 animate-fadeIn">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-3xl shadow-inner border border-amber-500/20">
          <FontAwesomeIcon icon={faWifi} />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-[var(--text-primary)]">
            {t.offlineTitle}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {t.offlineDesc}
          </p>
        </div>

        <div className="pt-2 flex flex-col gap-3">
          <button
            onClick={handleReload}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
          >
            <FontAwesomeIcon icon={faRotateRight} />
            <span>{t.offlineRetry}</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/"
              className="py-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border theme-border text-xs font-bold text-[var(--text-primary)] transition flex items-center justify-center gap-1.5"
            >
              <FontAwesomeIcon icon={faHouse} className="text-xs text-indigo-500" />
              <span>{translations[language].nav.home}</span>
            </Link>

            <Link
              href="/products"
              className="py-3 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border theme-border text-xs font-bold text-[var(--text-primary)] transition flex items-center justify-center gap-1.5"
            >
              <FontAwesomeIcon icon={faBagShopping} className="text-xs text-indigo-500" />
              <span>{translations[language].nav.shop}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
