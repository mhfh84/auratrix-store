'use client';

import React, { useState, useEffect, useCallback } from 'react';
import ProductCard from '@/components/ProductCard';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBolt, faFire, faClock, faTags, faArrowRight } from '@fortawesome/free-solid-svg-icons';
import Link from 'next/link';

interface DealsPageClientProps {
  initialProducts: any[];
}

export default function DealsPageClient({ initialProducts }: DealsPageClientProps) {
  const { language } = useSettings();
  const t = translations[language].deals;

  const [productsList, setProductsList] = useState(initialProducts);

  useEffect(() => {
    setProductsList(initialProducts);
  }, [initialProducts]);

  // Realtime updates listener
  const refreshDealsData = useCallback(async () => {
    try {
      const res = await fetch('/api/products?sort=newest');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const discounted = data.filter((p: any) => p.discountPercent > 0);
          setProductsList(discounted);
        }
      }
    } catch (e) {
      // Quietly ignore realtime refresh error
    }
  }, []);

  useRealtimeSync(refreshDealsData, { types: ['products', 'deals', 'all'] });

  // Flash sale countdown timer state (24h recurring timer)
  const [timeLeft, setTimeLeft] = useState({ hours: 14, mins: 42, secs: 19 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.secs > 0) {
          return { ...prev, secs: prev.secs - 1 };
        } else if (prev.mins > 0) {
          return { ...prev, mins: 59, secs: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, mins: 59, secs: 59 };
        }
        return { hours: 23, mins: 59, secs: 59 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Hero Banner with Live Countdown */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-rose-900 via-indigo-950 to-purple-950 border border-rose-500/30 p-8 sm:p-12 text-white shadow-2xl">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/30 border border-rose-400/40 text-rose-300 text-xs font-black uppercase tracking-wider backdrop-blur-md">
            <FontAwesomeIcon icon={faFire} className="text-rose-400 animate-bounce" />
            <span>{t.badge}</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            {t.title}
          </h1>

          <p className="text-sm text-rose-100/80 leading-relaxed max-w-xl">
            {t.subtitle}
          </p>

          {/* Countdown Clock */}
          <div className="pt-2">
            <p className="text-xs font-bold text-rose-200 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <FontAwesomeIcon icon={faClock} />
              <span>{t.flashEndsIn}</span>
            </p>

            <div className="flex items-center gap-3 font-mono">
              <div className="bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl text-center min-w-[70px]">
                <span className="text-2xl font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
                <span className="block text-[10px] text-rose-300 font-sans">{t.hours}</span>
              </div>
              <span className="text-2xl font-black text-rose-400">:</span>
              <div className="bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl text-center min-w-[70px]">
                <span className="text-2xl font-black text-white">{String(timeLeft.mins).padStart(2, '0')}</span>
                <span className="block text-[10px] text-rose-300 font-sans">{t.mins}</span>
              </div>
              <span className="text-2xl font-black text-rose-400">:</span>
              <div className="bg-black/50 backdrop-blur-md border border-white/10 px-4 py-2.5 rounded-2xl text-center min-w-[70px]">
                <span className="text-2xl font-black text-rose-400">{String(timeLeft.secs).padStart(2, '0')}</span>
                <span className="block text-[10px] text-rose-300 font-sans">{t.secs}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative background gradients */}
        <div className="absolute top-0 end-0 w-96 h-96 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 end-1/3 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Deals Products Grid */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b theme-border mb-6">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faTags} className="text-rose-500 text-lg" />
            <h2 className="text-lg font-black text-[var(--text-primary)]">
              {t.currentOffers} ({productsList.length})
            </h2>
          </div>
          <Link href="/products" className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
            <span>{t.viewFullCatalog}</span>
            <FontAwesomeIcon icon={faArrowRight} className={language === 'ar' ? 'rotate-180' : ''} />
          </Link>
        </div>

        {productsList.length === 0 ? (
          <div className="glass-panel p-12 text-center rounded-3xl border theme-border space-y-4">
            <p className="text-sm text-[var(--text-secondary)]">{t.noDeals}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {productsList.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

