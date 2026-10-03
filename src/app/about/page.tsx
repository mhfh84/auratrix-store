'use client';

import React from 'react';
import Link from 'next/link';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faShieldHalved,
  faTruckFast,
  faHeadset,
  faLock,
  faUsers,
  faMapLocationDot,
  faStar,
  faCertificate,
  faArrowRight,
  faArrowLeft,
  faCompass,
  faLightbulb,
} from '@fortawesome/free-solid-svg-icons';

export default function AboutPage() {
  const { language, serverSettings } = useSettings();
  const t = translations[language].aboutPage;
  const isRTL = language === 'ar';

  const pillars = [
    {
      title: t.pillar1Title,
      desc: t.pillar1Desc,
      icon: faCertificate,
      color: 'indigo',
    },
    {
      title: t.pillar2Title,
      desc: t.pillar2Desc,
      icon: faTruckFast,
      color: 'sky',
    },
    {
      title: t.pillar3Title,
      desc: t.pillar3Desc,
      icon: faHeadset,
      color: 'emerald',
    },
    {
      title: t.pillar4Title,
      desc: t.pillar4Desc,
      icon: faLock,
      color: 'purple',
    },
  ];

  const stats = [
    { value: '15,000+', label: t.statsHappy, icon: faUsers, color: 'text-indigo-500' },
    { value: '27', label: t.statsGov, icon: faMapLocationDot, color: 'text-sky-500' },
    { value: '99.8%', label: t.statsSatisfaction, icon: faStar, color: 'text-amber-500' },
    { value: '100%', label: t.statsAuthentic, icon: faShieldHalved, color: 'text-emerald-500' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
      {/* Hero Banner */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/50 text-purple-600 dark:text-purple-400 text-xs font-black tracking-wide">
          <FontAwesomeIcon icon={faBuilding} />
          <span>{t.storyBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[var(--text-primary)] tracking-tight">
          {t.storyTitle}
        </h1>
        <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      {/* Brand Story Narrative */}
      <div className="glass-panel p-8 sm:p-12 rounded-3xl border theme-border shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b theme-border pb-4">
          {serverSettings?.storeLogo ? (
            <img src={serverSettings.storeLogo} alt={serverSettings.storeName} className="h-10 max-w-[160px] object-contain" />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-md shadow-indigo-600/30">
              <FontAwesomeIcon icon={faLightbulb} />
            </div>
          )}
          <div>
            <h2 className="text-lg font-black text-[var(--text-primary)]">
              {serverSettings?.storeName || 'Store'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {t.storyTagline}
            </p>
          </div>
        </div>

        <div className="space-y-4 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
          <p>{t.storyP1}</p>
          <p>{t.storyP2}</p>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="glass-card p-6 rounded-2xl border theme-border text-center space-y-2 shadow-sm"
          >
            <FontAwesomeIcon icon={stat.icon} className={`text-2xl ${stat.color}`} />
            <p className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] font-mono">
              {stat.value}
            </p>
            <p className="text-xs text-[var(--text-secondary)] font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* 4 Core Pillars */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h3 className="text-2xl font-black text-[var(--text-primary)]">{t.pillarsTitle}</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {t.pillarsSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {pillars.map((p, idx) => (
            <div
              key={idx}
              className="glass-card p-6 sm:p-8 rounded-3xl border theme-border hover:border-indigo-400 space-y-3 shadow-sm transition"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xl border border-indigo-100 dark:border-indigo-900">
                <FontAwesomeIcon icon={p.icon} />
              </div>
              <h4 className="text-base font-bold text-[var(--text-primary)]">{p.title}</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Explore Catalog CTA */}
      <div className="glass-panel p-8 sm:p-12 rounded-3xl border border-indigo-300 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 text-center space-y-4 shadow-xl">
        <h3 className="text-2xl font-black text-[var(--text-primary)]">{t.ctaTitle}</h3>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
          {t.ctaDesc}
        </p>
        <div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition"
          >
            <span>{t.ctaBtn}</span>
            <FontAwesomeIcon icon={isRTL ? faArrowLeft : faArrowRight} />
          </Link>
        </div>
      </div>
    </div>
  );
}
