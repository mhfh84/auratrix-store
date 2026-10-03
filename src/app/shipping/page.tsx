'use client';

import React from 'react';
import Link from 'next/link';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTruckFast,
  faMapLocationDot,
  faBoxOpen,
  faEye,
  faClock,
  faShieldHalved,
  faBuildingColumns,
  faHandHoldingDollar,
} from '@fortawesome/free-solid-svg-icons';

export default function ShippingPage() {
  const { language } = useSettings();
  const t = translations[language].shippingPage;

  const regions = [
    {
      region: t.regionCairoGiza,
      time: t.timeCairoGiza,
      desc: t.descCairoGiza,
      badge: '24-48h',
      color: 'indigo',
    },
    {
      region: t.regionAlexDelta,
      time: t.timeAlexDelta,
      desc: t.descAlexDelta,
      badge: '2-3 Days',
      color: 'sky',
    },
    {
      region: t.regionCanal,
      time: t.timeCanal,
      desc: t.descCanal,
      badge: '2-3 Days',
      color: 'purple',
    },
    {
      region: t.regionUpper,
      time: t.timeUpper,
      desc: t.descUpper,
      badge: '3-5 Days',
      color: 'amber',
    },
    {
      region: t.regionRedSeaRemote,
      time: t.timeRedSeaRemote,
      desc: t.descRedSeaRemote,
      badge: '4-6 Days',
      color: 'rose',
    },
  ];

  const features = [
    {
      title: t.feat1Title,
      desc: t.feat1Desc,
      icon: faBoxOpen,
    },
    {
      title: t.feat2Title,
      desc: t.feat2Desc,
      icon: faEye,
    },
    {
      title: t.feat3Title,
      desc: t.feat3Desc,
      icon: faClock,
    },
    {
      title: t.feat4Title,
      desc: t.feat4Desc,
      icon: faShieldHalved,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 text-xs font-black tracking-wide">
          <FontAwesomeIcon icon={faMapLocationDot} />
          <span>{t.coverageBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
          {t.title}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      {/* Regional Shipping Duration Table */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border theme-border space-y-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b theme-border pb-4">
          <div>
            <h2 className="text-base sm:text-lg font-black text-[var(--text-primary)]">
              {t.tableTitle}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {t.tableSubtitle}
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-3 py-1 rounded-lg self-start sm:self-auto border border-indigo-200 dark:border-indigo-800/50">
            {t.doorstepDelivery}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b theme-border text-[var(--text-muted)] uppercase tracking-wider font-bold">
                <th className="pb-3 text-start w-1/3">{t.colRegion}</th>
                <th className="pb-3 text-start w-1/4">{t.colDuration}</th>
                <th className="pb-3 text-start">{t.colNotes}</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {regions.map((item, idx) => (
                <tr key={idx} className="hover:bg-[var(--bg-card)] transition">
                  <td className="py-4 font-bold text-[var(--text-primary)]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span>{item.region}</span>
                    </div>
                  </td>
                  <td className="py-4 font-black text-indigo-600 dark:text-indigo-400">
                    <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/40">
                      {item.time}
                    </span>
                  </td>
                  <td className="py-4 text-[var(--text-secondary)] leading-relaxed">
                    {item.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Features Grid */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h3 className="text-xl font-black text-[var(--text-primary)]">{t.featuresTitle}</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {t.featuresSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feat, idx) => (
            <div
              key={idx}
              className="glass-card p-6 rounded-2xl border theme-border hover:border-indigo-400 space-y-3 shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-base border border-indigo-100 dark:border-indigo-900">
                <FontAwesomeIcon icon={feat.icon} />
              </div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">{feat.title}</h4>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{feat.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Track Order CTA */}
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-indigo-300 dark:border-indigo-800/60 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 text-center space-y-4 shadow-xl">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl mx-auto shadow-lg shadow-indigo-600/30">
          <FontAwesomeIcon icon={faTruckFast} />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg sm:text-xl font-black text-[var(--text-primary)]">
            {t.trackCtaTitle}
          </h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {t.trackCtaSubtitle}
          </p>
        </div>
        <div>
          <Link
            href="/track-order"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/30 transition"
          >
            <FontAwesomeIcon icon={faTruckFast} />
            <span>{t.trackCtaBtn}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
