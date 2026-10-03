'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCompareStore } from '@/store/useCompareStore';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { getImageUrl } from '@/lib/images';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCodeCompare,
  faXmark,
  faTrashCan,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons';

export default function FloatingCompareBar() {
  const pathname = usePathname();
  const { items, removeFromCompare, clearCompare } = useCompareStore();
  const { language } = useSettings();
  const t = translations[language].compare;
  const isRTL = language === 'ar';

  const [isMinimized, setIsMinimized] = useState(false);

  // Do not show comparison dock if on /compare page itself, or in admin, or if empty
  if (items.length === 0 || pathname === '/compare' || pathname?.startsWith('/admin')) {
    return null;
  }

  return (
    <div
      className="fixed top-1/2 -translate-y-1/2 end-2 sm:end-4 z-40 flex items-center select-none animate-in fade-in slide-in-from-right-4 duration-300"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Minimized Floating Pill Button */}
      {isMinimized ? (
        <button
          onClick={() => setIsMinimized(false)}
          className="relative flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-600/40 border-2 border-white/20 transition-all duration-300 hover:scale-105 active:scale-95 group"
          title={t.compareNow}
        >
          <div className="relative">
            <FontAwesomeIcon icon={faCodeCompare} className="text-base" />
            <span className="absolute -top-2 -end-2 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-indigo-600 shadow-sm">
              {items.length}
            </span>
          </div>
          <span className="text-[10px] font-bold [writing-mode:vertical-lr] tracking-widest uppercase">
            {t.compareCount}
          </span>
          <FontAwesomeIcon
            icon={isRTL ? faChevronRight : faChevronLeft}
            className="text-[10px] opacity-70 group-hover:opacity-100 transition"
          />
        </button>
      ) : (
        /* Expanded Vertical Side Card */
        <div className="glass-card bg-white/95 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border-2 border-indigo-500/30 p-2.5 sm:p-3 flex flex-col items-center gap-3 w-16 sm:w-20">
          
          {/* Header with Minimize & Badge */}
          <div className="flex flex-col items-center gap-1 w-full pb-2 border-b theme-border">
            <div className="flex items-center justify-between w-full px-0.5">
              <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] font-black flex items-center justify-center border border-indigo-300 dark:border-indigo-800">
                {items.length}
              </span>
              <button
                onClick={() => setIsMinimized(true)}
                className="w-5 h-5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-[var(--text-muted)] hover:text-[var(--text-primary)] flex items-center justify-center text-[10px] transition"
                title={t.minimize}
              >
                <FontAwesomeIcon icon={isRTL ? faChevronLeft : faChevronRight} />
              </button>
            </div>
            
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-xs shadow-md shadow-indigo-600/30">
              <FontAwesomeIcon icon={faCodeCompare} />
            </div>
            <span className="text-[9px] font-black uppercase text-[var(--text-secondary)] tracking-wider">
              {t.compareCount}
            </span>
          </div>

          {/* Vertical Stack of Product Thumbnails */}
          <div className="flex flex-col items-center gap-2 py-1">
            {items.map((prod) => (
              <div
                key={prod.id}
                className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-xl overflow-hidden border-2 theme-border group bg-gray-100 dark:bg-gray-950 shadow-sm"
              >
                <Image
                  src={getImageUrl(prod.images)}
                  alt={prod.title}
                  fill
                  className="object-cover"
                />
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    removeFromCompare(prod.id);
                  }}
                  className="absolute inset-0 bg-black/70 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs transition"
                  title={t.remove}
                  aria-label={t.remove}
                >
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            ))}

            {/* Placeholders for remaining slots up to 4 */}
            {Array.from({ length: Math.max(0, 4 - items.length) }).map((_, i) => (
              <div
                key={i}
                className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center text-gray-400 text-xs font-bold"
                title={t.emptySlot}
              >
                +
              </div>
            ))}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col items-center gap-1.5 w-full pt-2 border-t theme-border">
            <Link
              href="/compare"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center text-[10px] font-bold transition active:scale-95 text-center"
              title={t.compareNow}
            >
              <span className="leading-tight text-[9px]">{t.compareNow}</span>
            </Link>

            <button
              onClick={clearCompare}
              className="w-full py-1 text-[10px] text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition text-center"
              title={t.clearAll}
            >
              <FontAwesomeIcon icon={faTrashCan} className="text-[10px]" />
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
