'use client';

import React from 'react';
import Link from 'next/link';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotateLeft,
  faShieldHalved,
  faCalendarCheck,
  faWrench,
  faCheckCircle,
  faTimesCircle,
  faCreditCard,
  faMoneyBillWave,
  faBolt,
  faWallet,
  faTruckPickup,
  faMagnifyingGlassChart,
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

export default function RefundPolicyPage() {
  const { language, serverSettings } = useSettings();
  const t = translations[language].refundPage;
  const isRTL = language === 'ar';

  const steps = [
    {
      num: '01',
      title: t.step1Title,
      desc: t.step1Desc,
      icon: faRotateLeft,
      color: 'indigo',
    },
    {
      num: '02',
      title: t.step2Title,
      desc: t.step2Desc,
      icon: faTruckPickup,
      color: 'sky',
    },
    {
      num: '03',
      title: t.step3Title,
      desc: t.step3Desc,
      icon: faMagnifyingGlassChart,
      color: 'purple',
    },
    {
      num: '04',
      title: t.step4Title,
      desc: t.step4Desc,
      icon: faShieldHalved,
      color: 'emerald',
    },
  ];

  const refundMethods = [
    {
      method: t.methodInstapay,
      timeline: t.timelineInstapay,
      icon: faBolt,
      iconColor: 'text-pink-500',
    },
    {
      method: t.methodWallet,
      timeline: t.timelineWallet,
      icon: faWallet,
      iconColor: 'text-amber-500',
    },
    {
      method: t.methodCard,
      timeline: t.timelineCard,
      icon: faCreditCard,
      iconColor: 'text-indigo-500',
    },
    {
      method: t.methodCod,
      timeline: t.timelineCod,
      icon: faMoneyBillWave,
      iconColor: 'text-emerald-500',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400 text-xs font-black tracking-wide">
          <FontAwesomeIcon icon={faRotateLeft} />
          <span>{t.guaranteeBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
          {t.title}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      {/* 2 Key Pillars: 14 Days & 30 Days */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-indigo-200 dark:border-indigo-800/50 relative overflow-hidden shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl flex-shrink-0 shadow-lg shadow-indigo-600/30">
              <FontAwesomeIcon icon={faCalendarCheck} />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-md">
                {t.standardReturnBadge}
              </span>
              <h3 className="text-lg font-black text-[var(--text-primary)]">{t.badge14Days}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.badge14DaysDesc}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-emerald-200 dark:border-emerald-800/50 relative overflow-hidden shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center text-xl flex-shrink-0 shadow-lg shadow-emerald-600/30">
              <FontAwesomeIcon icon={faWrench} />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 rounded-md">
                {t.consumerProtectionBadge}
              </span>
              <h3 className="text-lg font-black text-[var(--text-primary)]">{t.badge30Days}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.badge30DaysDesc}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4-Step Process Section */}
      <div className="space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-[var(--text-primary)]">{t.stepsTitle}</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            {t.stepsSubtitle}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="glass-card p-6 rounded-2xl border theme-border hover:border-indigo-400 space-y-4 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-sm font-bold border border-indigo-100 dark:border-indigo-900">
                  <FontAwesomeIcon icon={step.icon} />
                </div>
                <span className="text-xs font-mono font-black text-[var(--text-muted)]">{step.num}</span>
              </div>
              <div className="space-y-1.5">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">{step.title}</h4>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conditions & Non-Returnable Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Conditions */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border theme-border space-y-4 shadow-md">
          <h3 className="text-base font-black text-[var(--text-primary)] flex items-center gap-2">
            <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500" />
            <span>{t.conditionsTitle}</span>
          </h3>
          <ul className="space-y-3 text-xs text-[var(--text-secondary)] leading-relaxed">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>{t.condition1}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>{t.condition2}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>{t.condition3}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <span>{t.condition4}</span>
            </li>
          </ul>
        </div>

        {/* Non-Returnable */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border theme-border space-y-4 shadow-md">
          <h3 className="text-base font-black text-[var(--text-primary)] flex items-center gap-2">
            <FontAwesomeIcon icon={faTimesCircle} className="text-rose-500" />
            <span>{t.nonReturnableTitle}</span>
          </h3>
          <ul className="space-y-3 text-xs text-[var(--text-secondary)] leading-relaxed">
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
              <span>{t.nonReturnable1}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
              <span>{t.nonReturnable2}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 flex-shrink-0" />
              <span>{t.nonReturnable3}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Refund Methods & Timeline Table */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border theme-border space-y-6 shadow-md">
        <div className="space-y-1">
          <h3 className="text-base font-black text-[var(--text-primary)]">{t.refundMethodsTitle}</h3>
          <p className="text-xs text-[var(--text-secondary)]">
            {t.refundMethodsSubtitle}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b theme-border text-[var(--text-muted)] uppercase tracking-wider font-bold">
                <th className="pb-3 text-start">{t.methodHeader}</th>
                <th className="pb-3 text-start">{t.timelineHeader}</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {refundMethods.map((item, idx) => (
                <tr key={idx} className="hover:bg-[var(--bg-card)] transition">
                  <td className="py-3.5 font-bold text-[var(--text-primary)] flex items-center gap-2.5">
                    <FontAwesomeIcon icon={item.icon} className={item.iconColor} />
                    <span>{item.method}</span>
                  </td>
                  <td className="py-3.5 text-[var(--text-secondary)] leading-relaxed">
                    {item.timeline}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA Box */}
      <div className="glass-card p-8 rounded-3xl border border-emerald-300 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-950/20 text-center space-y-4 shadow-lg">
        <h3 className="text-lg font-black text-[var(--text-primary)]">{t.contactCta}</h3>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          {serverSettings?.socialWhatsApp && (
            <a
              href={serverSettings.socialWhatsApp}
              target="_blank"
              rel="noreferrer"
              className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faWhatsapp} className="text-sm" />
              <span>{t.contactCtaBtn}</span>
            </a>
          )}
          <Link
            href="/contact"
            className="px-6 py-3 rounded-2xl bg-[var(--bg-surface)] border theme-border hover:border-indigo-400 text-[var(--text-primary)] text-xs font-bold transition"
          >
            {t.contactFormBtn}
          </Link>
        </div>
      </div>
    </div>
  );
}
