'use client';

import React from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import CountdownTimer from '@/components/CountdownTimer';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faArrowRight, faFire } from '@fortawesome/free-solid-svg-icons';

interface FlashDealsSectionProps {
  products: any[];
}

export default function FlashDealsSection({ products }: FlashDealsSectionProps) {
  const { language } = useSettings();
  const t = translations[language].home;
  const isRTL = language === 'ar';

  const dealMap = new Map<string, any>();
  products.forEach((p) => {
    if (p && p.id && Boolean(p.discountPercent && p.discountPercent > 0) && !dealMap.has(p.id)) {
      dealMap.set(p.id, p);
    }
  });
  const dealProducts = Array.from(dealMap.values()).slice(0, 4);

  if (dealProducts.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-rose-300/60 dark:border-rose-800/60 bg-gradient-to-r from-rose-500/10 via-amber-500/10 to-purple-500/10 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-rose-200/50 dark:border-rose-800/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-500 text-white flex items-center justify-center text-xl shadow-lg shadow-rose-500/30 flex-shrink-0 animate-bounce">
              <FontAwesomeIcon icon={faBolt} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">
                  {isRTL ? 'عروض وخصومات الفلاش اليومية' : 'Daily Flash Deals'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">
                  {isRTL ? 'لفترة محدودة' : 'Limited'}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                {isRTL ? 'وفّر الكثير مع أفضل التخفيضات الحصرية' : 'Save big with limited-time exclusive discounts'}
              </p>
            </div>
          </div>

          <Link
            href="/deals"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md shadow-rose-600/20 transition self-start sm:self-auto"
          >
            <span>{isRTL ? 'تصفح كل العروض' : 'View All Deals'}</span>
            <FontAwesomeIcon icon={faArrowRight} className={`text-[10px] ${isRTL ? 'rotate-180' : ''}`} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {dealProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
