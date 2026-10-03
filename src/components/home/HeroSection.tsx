'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/store/useSettingsStore';
import { useCartStore } from '@/store/useCartStore';
import { useWishlist } from '@/store/useWishlistStore';
import { useCompareStore } from '@/store/useCompareStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl } from '@/lib/images';
import { getProductUrl } from '@/lib/productUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowRight,
  faTruckFast,
  faUserCheck,
  faShieldHalved,
  faStar,
  faBolt,
  faRotate,
  faHeart as faHeartSolid,
  faCodeCompare,
  faCartPlus,
  faCheck,
  faBan,
} from '@fortawesome/free-solid-svg-icons';

interface HeroSectionProps {
  candidatePool: any[];
  newArrivalsCount: number;
  categoriesCount: number;
}

export default function HeroSection({
  candidatePool,
  newArrivalsCount,
  categoriesCount,
}: HeroSectionProps) {
  const { language, currency } = useSettings();
  const { addItem } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompareStore();
  const t = translations[language].home;
  const isRTL = language === 'ar';

  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [isFading, setIsFading] = useState(false);

  const totalHeroBatches = useMemo(() => {
    return Math.max(1, Math.ceil(candidatePool.length / 4));
  }, [candidatePool.length]);

  const activeHeroProducts = useMemo(() => {
    if (candidatePool.length === 0) return [];
    if (candidatePool.length <= 4) return candidatePool;
    const startIndex = (heroSlideIndex * 4) % candidatePool.length;
    const slice = candidatePool.slice(startIndex, startIndex + 4);
    if (slice.length < 4) {
      return [...slice, ...candidatePool.slice(0, 4 - slice.length)];
    }
    return slice;
  }, [candidatePool, heroSlideIndex]);

  // Auto-rotate hero products every 5s with fade transition
  useEffect(() => {
    if (candidatePool.length <= 4) return;
    if (isHeroHovered) return;

    const interval = setInterval(() => {
      setIsFading(true);
      setTimeout(() => {
        setHeroSlideIndex((prev) => (prev + 1) % totalHeroBatches);
        setIsFading(false);
      }, 250);
    }, 5000);

    return () => clearInterval(interval);
  }, [candidatePool.length, isHeroHovered, totalHeroBatches]);

  const handleAddToCart = (e: React.MouseEvent, product: any, finalPrice: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.stockQuantity !== undefined && product.stockQuantity <= 0) return;
    const success = addItem({
      id: product.id,
      title: product.title,
      price: finalPrice,
      image: getImageUrl(product.images),
      stockQuantity: product.stockQuantity ?? 10,
    });
    if (success) {
      setAddedIds((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => setAddedIds((prev) => ({ ...prev, [product.id]: false })), 1800);
    }
  };

  return (
    <section
      className="relative overflow-hidden border-b theme-border pt-10 pb-16 px-4 sm:px-6 lg:px-8 transition-colors duration-300"
      style={{
        background: 'linear-gradient(135deg, var(--bg-surface) 0%, var(--bg-primary) 50%, var(--bg-surface) 100%)',
      }}
    >
      {/* Ambient glow blobs */}
      <div
        className="absolute -top-32 -start-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 transition-colors duration-300"
        style={{ backgroundColor: 'var(--accent-color)' }}
      />
      <div
        className="absolute -bottom-24 -end-24 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-15 transition-colors duration-300"
        style={{ backgroundColor: 'var(--accent-color)' }}
      />

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
        {/* LEFT — Text & CTAs */}
        <div className="space-y-7 text-center lg:text-start">
          <div
            className="inline-flex items-center gap-2 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all duration-300"
            style={{
              backgroundColor: 'var(--accent-color)',
              boxShadow: '0 8px 20px -4px var(--accent-color, rgba(99, 102, 241, 0.4))',
            }}
          >
            <FontAwesomeIcon icon={faStar} className="text-yellow-300" />
            <span>{t.badge}</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-[var(--text-primary)] tracking-tight leading-[1.1]">
            {t.heroTitle1}{' '}
            <span
              className="bg-clip-text text-transparent transition-all duration-300"
              style={{
                backgroundImage: 'linear-gradient(to right, var(--accent-color), var(--text-primary))',
              }}
            >
              {t.heroTitle2}
            </span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-lg mx-auto lg:mx-0 leading-relaxed">
            {t.heroDesc}
          </p>

          <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
            {[
              { icon: faTruckFast,   label: t.feature1Title },
              { icon: faShieldHalved, label: t.feature3Title },
              { icon: faUserCheck,   label: t.feature2Title },
            ].map((pill, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-surface)] border theme-border px-3 py-1.5 rounded-full shadow-sm">
                <FontAwesomeIcon icon={pill.icon} style={{ color: 'var(--accent-color)' }} />
                {pill.label}
              </span>
            ))}
          </div>

          <div className="flex items-center justify-center lg:justify-start gap-6 pt-1">
            {[
              { value: newArrivalsCount > 0 ? `${newArrivalsCount}+` : '100+', label: translations[language].nav.shop },
              { value: categoriesCount > 0 ? `${categoriesCount}` : '10+', label: translations[language].categories.title },
              { value: '⚡', label: translations[language].features.shipping },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-black text-[var(--text-primary)]">{stat.value}</div>
                <div className="text-[11px] text-[var(--text-muted)] font-medium uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
            <Link
              href="/products"
              className="w-full sm:w-auto px-8 py-4 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 hover:brightness-110"
              style={{
                backgroundColor: 'var(--accent-color)',
                boxShadow: '0 10px 25px -5px var(--accent-color, rgba(99, 102, 241, 0.4))',
              }}
            >
              <span>{t.shopCatalog}</span>
              <FontAwesomeIcon icon={faArrowRight} className={isRTL ? 'rotate-180' : ''} />
            </Link>
            <Link
              href="/checkout"
              className="w-full sm:w-auto px-8 py-4 bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] border theme-border font-semibold rounded-2xl flex items-center justify-center gap-2 transition shadow-sm"
            >
              <span>{t.guestCheckout}</span>
            </Link>
          </div>
        </div>

        {/* RIGHT — Dynamic live product mosaic (Rotates every 5s) */}
        <div
          className="relative"
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
        >
          <div className={`grid grid-cols-2 gap-3 transition-all duration-300 ${isFading ? 'opacity-20 scale-98' : 'opacity-100 scale-100'}`}>
            {(activeHeroProducts.length >= 4 ? activeHeroProducts.slice(0, 4) : [
              { id: 'p1', title: 'Premium Product', images: '[]', price: 0, category: null },
              { id: 'p2', title: 'Top Pick', images: '[]', price: 0, category: null },
              { id: 'p3', title: 'New Arrival', images: '[]', price: 0, category: null },
              { id: 'p4', title: 'Best Value', images: '[]', price: 0, category: null },
            ]).map((product, i) => {
              const hasDiscount = Boolean(product.discountPercent && product.discountPercent > 0);
              const finalPrice = hasDiscount
                ? product.price * (1 - product.discountPercent! / 100)
                : product.price;
              const inWishlist = product.price > 0 && isInWishlist(product.id);
              const inCompare = product.price > 0 && isInCompare(product.id);
              const isAdded = product.price > 0 && Boolean(addedIds[product.id]);
              const isOutOfStock = product.price > 0 && (product.stockQuantity !== undefined && product.stockQuantity <= 0);

              return (
                <div
                  key={`${product.id}-${i}`}
                  className={`group relative overflow-hidden rounded-2xl border theme-border shadow-sm hover:shadow-xl transition-all duration-300 bg-[var(--bg-surface)] text-[var(--text-primary)] ${
                    i === 0 ? 'aspect-square' : i === 1 ? 'aspect-[4/5]' : i === 2 ? 'aspect-[4/5]' : 'aspect-square'
                  }`}
                  style={{ backgroundColor: 'var(--bg-surface)' }}
                >
                  <Link
                    href={product.price > 0 ? getProductUrl(product) : '/products'}
                    className="absolute inset-0 block"
                  >
                    <Image
                      src={getImageUrl(product.images)}
                      alt={product.title}
                      fill
                      sizes="(max-width: 640px) 45vw, 260px"
                      className="object-cover group-hover:scale-108 transition-transform duration-700 ease-out"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />
                  </Link>

                  <div className="absolute top-2.5 start-2.5 flex flex-col gap-1 z-10">
                    {hasDiscount && (
                      <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-md backdrop-blur-sm">
                        -{Math.round(product.discountPercent!)}%
                      </span>
                    )}
                    {isOutOfStock && (
                      <span className="bg-red-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
                        {translations[language].product.outOfStock}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-2.5 end-2.5 flex flex-col gap-1.5 z-10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (product.price > 0) {
                          toggleWishlist({
                            id: product.id,
                            title: product.title,
                            price: finalPrice,
                            image: getImageUrl(product.images),
                            stockQuantity: product.stockQuantity ?? 10,
                          });
                        }
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-200 ${
                        inWishlist
                          ? 'bg-rose-500 text-white border-rose-400 scale-110'
                          : 'bg-black/30 text-white border-white/20 hover:bg-rose-500 hover:scale-110'
                      }`}
                    >
                      <FontAwesomeIcon icon={faHeartSolid} className="text-[10px]" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (product.price > 0) toggleCompare(product);
                      }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-md border transition-all duration-200 ${
                        inCompare
                          ? 'bg-indigo-600 text-white border-indigo-400 scale-110'
                          : 'bg-black/30 text-white border-white/20 hover:bg-indigo-600 hover:scale-110'
                      }`}
                    >
                      <FontAwesomeIcon icon={faCodeCompare} className="text-[9px]" />
                    </button>
                  </div>

                  <div className="absolute bottom-0 inset-x-0 p-3 text-white z-10 space-y-1 pointer-events-none">
                    <p className="text-xs font-bold line-clamp-1 leading-snug drop-shadow-sm">
                      {product.title}
                    </p>
                    <div className="flex items-center justify-between pointer-events-auto">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xs font-black font-mono">
                          {product.price > 0 ? formatPrice(finalPrice, currency, language) : ''}
                        </span>
                        {hasDiscount && (
                          <span className="text-[10px] text-gray-300 line-through font-mono">
                            {formatPrice(product.price, currency, language)}
                          </span>
                        )}
                      </div>
                      {product.price > 0 && !isOutOfStock && (
                        <button
                          onClick={(e) => handleAddToCart(e, product, finalPrice)}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                            isAdded ? 'bg-emerald-500 text-white' : 'bg-white/90 text-gray-900 hover:bg-white hover:scale-110'
                          }`}
                        >
                          <FontAwesomeIcon icon={isAdded ? faCheck : faCartPlus} className="text-[10px]" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dots */}
          {totalHeroBatches > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {Array.from({ length: totalHeroBatches }).map((_, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setIsFading(true);
                    setTimeout(() => {
                      setHeroSlideIndex(idx);
                      setIsFading(false);
                    }, 200);
                  }}
                  className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                    heroSlideIndex === idx
                      ? 'w-6 bg-[var(--accent-color,#6366f1)] shadow-sm'
                      : 'w-1.5 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Floating badge — Fast Delivery */}
          <div
            className="absolute -top-3 -start-3 lg:-start-5 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg transition-colors duration-300 z-20 pointer-events-none"
            style={{
              backgroundColor: 'var(--accent-color, #6366f1)',
              boxShadow: '0 6px 16px -3px var(--accent-color, rgba(99, 102, 241, 0.4))',
            }}
          >
            {translations[language].features.shippingDesc}
          </div>

          {/* Floating deals pill */}
          <Link
            href="/deals"
            className="absolute -bottom-4 start-1/2 -translate-x-1/2 lg:start-auto lg:translate-x-0 lg:-end-4 bg-[var(--bg-surface)] border theme-border shadow-2xl rounded-2xl px-4 py-3 flex items-center gap-3 min-w-[220px] transition-all duration-300 hover:scale-105 hover:shadow-indigo-500/20 active:scale-95 group/badge cursor-pointer z-20"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md text-white transition-all duration-300 relative group-hover/badge:scale-110"
              style={{
                backgroundColor: 'var(--accent-color)',
                boxShadow: '0 4px 14px -2px var(--accent-color, rgba(99, 102, 241, 0.4))',
              }}
            >
              <FontAwesomeIcon icon={faBolt} className="text-white text-base animate-pulse" />
              <span className="absolute -top-1 -end-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[var(--bg-surface)] animate-ping" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black text-[var(--text-primary)] group-hover/badge:text-[var(--accent-color,#6366f1)] transition-colors truncate">
                  {isRTL ? 'عروض وتخفيضات حصرية' : 'Exclusive Flash Deals'}
                </p>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full text-white bg-rose-500 uppercase">
                  {isRTL ? 'مباشر' : 'LIVE'}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text-secondary)] font-medium mt-0.5 truncate">
                {isRTL ? 'تصفح جميع العروض والتخفيضات ⚡' : 'Explore all deals & discounts ⚡'}
              </p>
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
