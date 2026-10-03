'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCircleQuestion,
  faSearch,
  faChevronDown,
  faChevronUp,
  faCreditCard,
  faTruckFast,
  faRotateLeft,
  faShieldHalved,
  faBoxOpen,
  faEnvelope,
  faPhone,
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

export default function FaqPage() {
  const { language, serverSettings } = useSettings();
  const t = translations[language].faqPage;
  const isRTL = language === 'ar';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    'pay-1': true,
    'ship-1': true,
  });

  const categories = [
    { id: 'all', label: t.all, icon: faCircleQuestion },
    { id: 'catPayments', label: t.catPayments, icon: faCreditCard },
    { id: 'catShipping', label: t.catShipping, icon: faTruckFast },
    { id: 'catReturns', label: t.catReturns, icon: faRotateLeft },
    { id: 'catWarranty', label: t.catWarranty, icon: faShieldHalved },
    { id: 'catOrders', label: t.catOrders, icon: faBoxOpen },
  ];

  const toggleItem = (id: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const filteredFaqs = useMemo(() => {
    return t.faqList.filter((item) => {
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !query ||
        item.question.toLowerCase().includes(query) ||
        item.answer.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [t.faqList, selectedCategory, searchQuery]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/50 text-indigo-600 dark:text-indigo-400 text-xs font-black tracking-wide">
          <FontAwesomeIcon icon={faCircleQuestion} />
          <span>{t.supportBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
          {t.title}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {t.subtitle}
        </p>

        {/* Live Search Input */}
        <div className="relative pt-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-2xl ps-12 pe-4 py-4 border theme-border shadow-md focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
          />
          <FontAwesomeIcon
            icon={faSearch}
            className="absolute start-4.5 top-1/2 translate-y-[-20%] text-[var(--text-muted)] text-base"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute end-4 top-1/2 translate-y-[-20%] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold px-2 py-1 bg-[var(--bg-card)] rounded-md border theme-border"
            >
              {t.clearSearch}
            </button>
          )}
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap pb-2">
        {categories.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-indigo-600/30'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border theme-border hover:border-indigo-400 hover:text-[var(--text-primary)]'
              }`}
            >
              <FontAwesomeIcon icon={cat.icon} className={isActive ? 'text-white' : 'text-indigo-500'} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-4">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((item) => {
            const isOpen = !!openItems[item.id];
            return (
              <div
                key={item.id}
                className={`glass-card rounded-2xl border transition overflow-hidden shadow-sm ${
                  isOpen
                    ? 'border-indigo-400/60 dark:border-indigo-600/60 bg-[var(--bg-surface)] ring-1 ring-indigo-400/20'
                    : 'theme-border hover:border-indigo-300 dark:hover:border-indigo-700/60'
                }`}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full px-6 py-4.5 text-start flex items-center justify-between gap-4 font-extrabold text-sm text-[var(--text-primary)]"
                >
                  <span className="leading-snug">{item.question}</span>
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 transition-transform duration-200 ${
                      isOpen
                        ? 'bg-indigo-600 text-white rotate-180'
                        : 'bg-[var(--bg-card)] border theme-border text-[var(--text-muted)]'
                    }`}
                  >
                    <FontAwesomeIcon icon={faChevronDown} />
                  </div>
                </button>
                {isOpen && (
                  <div className="px-6 pb-5 pt-1 text-xs text-[var(--text-secondary)] leading-relaxed border-t theme-border animate-fadeIn">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="glass-panel p-10 rounded-3xl border theme-border text-center space-y-3">
            <FontAwesomeIcon icon={faCircleQuestion} className="text-3xl text-[var(--text-muted)]" />
            <h3 className="text-base font-bold text-[var(--text-primary)]">{t.noFaqFound}</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">{t.tryDifferentSearch}</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/25"
            >
              {t.viewAllCategories}
            </button>
          </div>
        )}
      </div>

      {/* Still Need Help - Support CTA Box */}
      <div className="glass-panel p-8 sm:p-10 rounded-3xl border theme-border shadow-xl space-y-6 text-center">
        <div className="max-w-xl mx-auto space-y-2">
          <h3 className="text-xl font-black text-[var(--text-primary)]">{t.stillNeedHelp}</h3>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
            {t.stillNeedHelpDesc}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* WhatsApp Direct */}
          {serverSettings?.socialWhatsApp && (
            <a
              href={serverSettings.socialWhatsApp}
              target="_blank"
              rel="noreferrer"
              className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/50 hover:scale-[1.02] transition flex flex-col items-center justify-center gap-2 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center text-lg shadow-md shadow-emerald-500/25">
                <FontAwesomeIcon icon={faWhatsapp} />
              </div>
              <span className="text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
                {t.chatWhatsapp}
              </span>
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                {t.instantResponse}
              </span>
            </a>
          )}

          {/* Email Support */}
          {serverSettings?.contactEmail && (
            <a
              href={`mailto:${serverSettings.contactEmail}`}
              className="p-5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-700/50 hover:scale-[1.02] transition flex flex-col items-center justify-center gap-2 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-lg shadow-md shadow-indigo-600/25">
                <FontAwesomeIcon icon={faEnvelope} />
              </div>
              <span className="text-xs font-extrabold text-indigo-900 dark:text-indigo-300">
                {t.emailSupport}
              </span>
              <span className="text-[10px] text-indigo-700 dark:text-indigo-400 truncate max-w-[180px]">
                {serverSettings.contactEmail}
              </span>
            </a>
          )}

          {/* Direct Phone */}
          {serverSettings?.contactPhone && (
            <a
              href={`tel:${serverSettings.contactPhone}`}
              className="p-5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-300 dark:border-sky-700/50 hover:scale-[1.02] transition flex flex-col items-center justify-center gap-2 group shadow-sm"
            >
              <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center text-lg shadow-md shadow-sky-600/25">
                <FontAwesomeIcon icon={faPhone} />
              </div>
              <span className="text-xs font-extrabold text-sky-900 dark:text-sky-300">
                {t.callSupport}
              </span>
              <span className="text-[10px] text-sky-700 dark:text-sky-400">
                {serverSettings.contactPhone}
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
