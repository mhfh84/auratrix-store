'use client';

import React from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';

interface ProductSectionProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeIcon?: IconDefinition;
  badgeColorClass?: string;
  products: any[];
  viewAllHref?: string;
  limit?: number;
}

export default function ProductSection({
  title,
  subtitle,
  badgeText,
  badgeIcon,
  badgeColorClass = 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-700/50',
  products,
  viewAllHref = '/products',
  limit = 8,
}: ProductSectionProps) {
  const { language } = useSettings();
  const t = translations[language].home;
  const isRTL = language === 'ar';

  const displayedProducts = products.slice(0, limit);
  if (displayedProducts.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b theme-border">
        <div>
          {badgeText && (
            <div className="flex items-center gap-2 mb-1.5">
              {badgeIcon && (
                <div className={`p-1.5 border rounded-lg ${badgeColorClass}`}>
                  <FontAwesomeIcon icon={badgeIcon} className="text-xs" />
                </div>
              )}
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {badgeText}
              </span>
            </div>
          )}
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-lg">
              {subtitle}
            </p>
          )}
        </div>

        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 px-3 py-1.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm flex-shrink-0"
        >
          <span>{t.viewAll}</span>
          <FontAwesomeIcon icon={faArrowRight} className={`text-[10px] ${isRTL ? 'rotate-180' : ''}`} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {displayedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
