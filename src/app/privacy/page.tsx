'use client';

import React from 'react';
import Link from 'next/link';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLock,
  faDatabase,
  faShieldHalved,
  faCreditCard,
  faHandshakeAngle,
  faCookieBite,
  faUserCheck,
  faEnvelope,
} from '@fortawesome/free-solid-svg-icons';

export default function PrivacyPage() {
  const { language, serverSettings } = useSettings();
  const t = translations[language].privacyPage;
  const isRTL = language === 'ar';

  const sections = [
    { title: t.sec1Title, content: t.sec1Content, icon: faDatabase },
    { title: t.sec2Title, content: t.sec2Content, icon: faShieldHalved },
    { title: t.sec3Title, content: t.sec3Content, icon: faCreditCard },
    { title: t.sec4Title, content: t.sec4Content, icon: faHandshakeAngle },
    { title: t.sec5Title, content: t.sec5Content, icon: faCookieBite },
    { title: t.sec6Title, content: t.sec6Content, icon: faUserCheck },
    { title: t.sec7Title, content: t.sec7Content, icon: faEnvelope },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 text-xs font-black tracking-wide">
          <FontAwesomeIcon icon={faLock} />
          <span>{t.privacyBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
          {t.title}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {t.subtitle}
        </p>
        <span className="inline-block text-[11px] font-mono text-[var(--text-muted)] bg-[var(--bg-card)] px-3 py-1 rounded-md border theme-border">
          {t.lastUpdated}
        </span>
      </div>

      {/* Sections Card List */}
      <div className="space-y-6">
        {sections.map((sec, idx) => (
          <div
            key={idx}
            className="glass-panel p-6 sm:p-8 rounded-3xl border theme-border space-y-3 shadow-sm hover:border-emerald-400/50 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-xs flex-shrink-0 border border-emerald-100 dark:border-emerald-900">
                <FontAwesomeIcon icon={sec.icon} />
              </div>
              <h2 className="text-base font-black text-[var(--text-primary)]">
                {sec.title}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed ps-11">
              {sec.content}
            </p>
          </div>
        ))}
      </div>

      {/* Footer Navigation Strip */}
      <div className="glass-card p-6 rounded-2xl border theme-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <span className="text-[var(--text-muted)]">
          {t.privacyPriority}
        </span>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            {translations[language].footer.terms}
          </Link>
          <span>•</span>
          <Link href="/contact" className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline">
            {translations[language].footer.contactUs}
          </Link>
        </div>
      </div>
    </div>
  );
}
