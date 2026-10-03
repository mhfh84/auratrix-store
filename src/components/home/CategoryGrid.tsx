'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faLayerGroup, faArrowRight, faShapes } from '@fortawesome/free-solid-svg-icons';

interface CategoryGridProps {
  categories: any[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
  const { language } = useSettings();
  const t = translations[language].home;
  const isRTL = language === 'ar';

  const rootCategories = categories.filter((cat) => !cat.parentId);
  if (rootCategories.length === 0) return null;

  const fallbackGradients = [
    'from-indigo-600/30 via-purple-600/20 to-pink-600/30',
    'from-blue-600/30 via-cyan-600/20 to-teal-600/30',
    'from-emerald-600/30 via-teal-600/20 to-cyan-600/30',
    'from-amber-600/30 via-orange-600/20 to-rose-600/30',
    'from-rose-600/30 via-pink-600/20 to-purple-600/30',
    'from-violet-600/30 via-fuchsia-600/20 to-indigo-600/30',
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b theme-border">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-700/50 rounded-lg">
              <FontAwesomeIcon icon={faLayerGroup} className="text-indigo-600 dark:text-indigo-400 text-xs" />
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
              {translations[language].categories.title}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] tracking-tight">
            {t.categories}
          </h2>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-lg">
            {t.categoriesDesc}
          </p>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/40 px-3 py-1.5 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 shadow-sm flex-shrink-0"
        >
          <span>{t.viewAll}</span>
          <FontAwesomeIcon icon={faArrowRight} className={`text-[10px] ${isRTL ? 'rotate-180' : ''}`} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
        {rootCategories.map((cat, idx) => {
          const productCount = cat._count?.products;
          const subCount = cat._count?.children;
          const fallbackBg = fallbackGradients[idx % fallbackGradients.length];

          return (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group relative aspect-[4/3] sm:aspect-[16/11] rounded-2xl sm:rounded-3xl overflow-hidden border theme-border shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 bg-gradient-to-br from-indigo-950/20 to-[var(--bg-surface)] flex flex-col justify-between"
            >
              {/* Background Image / Ambient Fallback */}
              {cat.image ? (
                <Image
                  src={cat.image}
                  alt={cat.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
                />
              ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${fallbackBg} flex items-center justify-center`}>
                  <span className="text-4xl sm:text-5xl font-black text-white/10 uppercase select-none tracking-widest group-hover:scale-125 transition-transform duration-700">
                    {cat.name.slice(0, 2)}
                  </span>
                </div>
              )}

              {/* Dark Contrast Wash */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10 group-hover:from-black/90 group-hover:via-black/45 transition-colors duration-300 pointer-events-none" />

              {/* Top-Start: Category Stats Pill Badge */}
              <div className="relative z-10 p-3 sm:p-3.5">
                <span className="inline-flex items-center gap-1 bg-black/40 dark:bg-black/60 text-white/95 text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full backdrop-blur-md border border-white/15 shadow-sm">
                  <FontAwesomeIcon icon={faShapes} className="text-[9px] text-indigo-300" />
                  <span>
                    {productCount !== undefined && productCount > 0
                      ? `${productCount} ${translations[language].wishlist.items}`
                      : subCount !== undefined && subCount > 0
                      ? `${subCount}`
                      : isRTL
                      ? translations[language].categories.featured
                      : 'Collection'}
                  </span>
                </span>
              </div>

              {/* Bottom: Title, Description & Action Button */}
              <div className="relative z-10 p-3 sm:p-4 flex items-end justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-base font-extrabold text-white group-hover:text-indigo-200 transition-colors leading-snug truncate">
                    {cat.name}
                  </h3>
                  {cat.description ? (
                    <p className="text-[10px] sm:text-[11px] text-white/75 line-clamp-1 mt-0.5 font-normal">
                      {cat.description}
                    </p>
                  ) : (
                    <p className="text-[10px] sm:text-[11px] text-white/60 font-medium flex items-center gap-1 mt-0.5">
                      <span>{translations[language].hero.explore}</span>
                    </p>
                  )}
                </div>

                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 dark:bg-white/15 backdrop-blur-md border border-white/25 text-white flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:border-indigo-500 group-hover:scale-110 transition-all duration-300 shadow-md">
                  <FontAwesomeIcon icon={faArrowRight} className={`text-[10px] sm:text-xs ${isRTL ? 'rotate-180' : ''}`} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
