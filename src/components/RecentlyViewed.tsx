'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRecentlyViewedStore } from '@/store/useRecentlyViewedStore';
import { useCartStore } from '@/store/useCartStore';
import { useWishlist } from '@/store/useWishlistStore';
import { useCompareStore } from '@/store/useCompareStore';
import { useToastStore } from '@/store/useToastStore';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl } from '@/lib/images';
import { getProductUrl } from '@/lib/productUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClockRotateLeft,
  faTrashCan,
  faChevronLeft,
  faChevronRight,
  faHeart as faHeartSolid,
  faCodeCompare,
  faCartPlus,
  faCheck,
  faBan,
} from '@fortawesome/free-solid-svg-icons';

interface RecentlyViewedProps {
  currentProductId?: string;
  limit?: number;
  className?: string;
}

export default function RecentlyViewed({
  currentProductId,
  limit = 8,
  className = '',
}: RecentlyViewedProps) {
  const { items, clearRecentlyViewed } = useRecentlyViewedStore();
  const { addItem } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompareStore();
  const { language, currency } = useSettings();
  const t = translations[language].recentlyViewed;
  const compT = translations[language].compare;
  const isRTL = language === 'ar';
  const scrollRef = useRef<HTMLDivElement>(null);

  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // Filter out the currently viewed product if on product details
  const displayItems = items
    .filter((item) => !currentProductId || item.id !== currentProductId)
    .slice(0, limit);

  if (displayItems.length === 0) {
    return null; // Do not render section if empty
  }

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleWishlistToggle = (e: React.MouseEvent, product: any, finalPrice: number) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      id: product.id,
      title: product.title,
      price: finalPrice,
      discountPercent: product.discountPercent,
      image: getImageUrl(product.images),
      stockQuantity: product.stockQuantity ?? 10,
    });
  };

  const handleCompareToggle = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    const result = toggleCompare({
      id: product.id,
      title: product.title,
      description: product.description || '',
      price: product.price,
      discountPercent: product.discountPercent,
      stockQuantity: product.stockQuantity ?? 10,
      images: product.images,
      categories: product.categories,
      variants: product.variants,
    });

    if (result.maxReached) {
      useToastStore.getState().warning(compT.maxReached);
    } else if (result.added) {
      useToastStore.getState().success(compT.addedToCompare);
    } else {
      useToastStore.getState().info(compT.removedFromCompare);
    }
  };

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
    <section className={`space-y-4 sm:space-y-6 pt-8 sm:pt-10 border-t theme-border ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/40 mb-1">
            <FontAwesomeIcon icon={faClockRotateLeft} className="text-[11px]" />
            <span>{t.title}</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-black text-[var(--text-primary)] tracking-tight truncate">
            {t.title}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-1 sm:line-clamp-none">
            {t.subtitle}
          </p>
        </div>

        {/* Actions & Scroll Controls */}
        <div className="flex items-center gap-2 flex-shrink-0 pt-1 sm:pt-0">
          <button
            onClick={clearRecentlyViewed}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs text-[var(--text-muted)] hover:text-rose-500 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 border theme-border transition active:scale-95 shadow-sm"
            title={t.clearHistory}
          >
            <FontAwesomeIcon icon={faTrashCan} className="text-[11px]" />
            <span className="hidden xs:inline sm:inline">{t.clearHistory}</span>
          </button>

          {displayItems.length > 2 && (
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => handleScroll(isRTL ? 'right' : 'left')}
                className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] border theme-border text-[var(--text-primary)] hover:border-indigo-500 flex items-center justify-center text-xs shadow-sm transition active:scale-95"
                aria-label="Scroll previous"
              >
                <FontAwesomeIcon icon={faChevronLeft} className={isRTL ? 'rotate-180' : ''} />
              </button>
              <button
                onClick={() => handleScroll(isRTL ? 'left' : 'right')}
                className="w-8 h-8 rounded-xl bg-[var(--bg-surface)] border theme-border text-[var(--text-primary)] hover:border-indigo-500 flex items-center justify-center text-xs shadow-sm transition active:scale-95"
                aria-label="Scroll next"
              >
                <FontAwesomeIcon icon={faChevronRight} className={isRTL ? 'rotate-180' : ''} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Carousel / Scroll Track (Edge-to-edge smooth swipe on mobile) */}
      <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
        <div
          ref={scrollRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar scroll-smooth snap-x snap-mandatory touch-pan-x"
        >
          {displayItems.map((product) => {
            const hasDiscount = Boolean(product.discountPercent && product.discountPercent > 0);
            const finalPrice = hasDiscount
              ? product.price * (1 - product.discountPercent! / 100)
              : product.price;

            const inWishlist = isInWishlist(product.id);
            const inCompare = isInCompare(product.id);
            const isAdded = Boolean(addedIds[product.id]);
            const isOutOfStock = product.stockQuantity !== undefined && product.stockQuantity <= 0;

            return (
              <div
                key={product.id}
                className="flex-none w-[180px] sm:w-[220px] rounded-2xl overflow-hidden flex flex-col justify-between group border theme-border hover:shadow-xl transition-all duration-300 bg-[var(--bg-surface)] text-[var(--text-primary)]"
                style={{ backgroundColor: 'var(--bg-surface)' }}
              >
                {/* Top Half: Image & Overlay */}
                <div>
                  <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-950 overflow-hidden">
                    <Link href={getProductUrl(product)} className="block w-full h-full">
                      <Image
                        src={getImageUrl(product.images)}
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 180px, 220px"
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>

                    {/* Top Start: Out of Stock or Discount Badge */}
                    <div className="absolute top-2 start-2 z-10 flex flex-col gap-1">
                      {isOutOfStock ? (
                        <span className="bg-red-600/95 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-red-400/50 backdrop-blur-md flex items-center gap-1 shadow-sm">
                          <FontAwesomeIcon icon={faBan} className="text-[9px]" />
                          <span>{translations[language].productCard.outOfStock}</span>
                        </span>
                      ) : null}
                      {hasDiscount && (
                        <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full shadow-md backdrop-blur-md border border-rose-400/40">
                          -{Math.round(product.discountPercent!)}%
                        </span>
                      )}
                    </div>

                    {/* Top End: Floating Action Buttons (Wishlist & Compare) */}
                    <div className="absolute top-2 end-2 flex flex-col items-center gap-1.5 z-10">
                      {/* Wishlist Button */}
                      <button
                        onClick={(e) => handleWishlistToggle(e, product, finalPrice)}
                        title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                        aria-label="Toggle wishlist"
                        className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all duration-300 shadow-lg ${
                          inWishlist
                            ? 'bg-rose-500 text-white border-rose-400 scale-110 shadow-rose-500/40'
                            : 'bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 border-gray-200/90 dark:border-gray-700 hover:text-rose-500 hover:border-rose-300 hover:scale-115 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-black/15'
                        }`}
                      >
                        <FontAwesomeIcon icon={faHeartSolid} className="text-xs" />
                      </button>

                      {/* Compare Button */}
                      <button
                        onClick={(e) => handleCompareToggle(e, product)}
                        title={inCompare ? compT.removeFromCompare : compT.addToCompare}
                        aria-label={inCompare ? compT.removeFromCompare : compT.addToCompare}
                        style={inCompare ? { backgroundColor: 'var(--accent-color, #6366f1)', borderColor: 'var(--accent-color, #6366f1)' } : undefined}
                        className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all duration-300 shadow-lg ${
                          inCompare
                            ? 'text-white scale-110 shadow-indigo-500/40'
                            : 'bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 border-gray-200/90 dark:border-gray-700 hover:text-[var(--accent-color,#6366f1)] hover:border-indigo-300 hover:scale-115 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shadow-black/15'
                        }`}
                      >
                        <FontAwesomeIcon icon={faCodeCompare} className="text-[11px]" />
                      </button>
                    </div>

                    {/* Bottom Start: Category Pill Badge */}
                    {product.categories && product.categories.length > 0 && (
                      <span className="absolute bottom-2 start-2 bg-white/95 dark:bg-gray-900/95 text-gray-800 dark:text-gray-100 text-[9px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xl border border-gray-200/90 dark:border-gray-700 shadow-md shadow-black/10 flex items-center gap-1 z-10">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                        <span>{product.categories[0].name}</span>
                      </span>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="p-2.5 sm:p-3 space-y-1">
                    <Link href={getProductUrl(product)}>
                      <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] hover:text-[var(--accent-color,#6366f1)] transition-colors leading-snug">
                        {product.title}
                      </h3>
                    </Link>
                  </div>
                </div>

                {/* Bottom Footer: Price & Add to Cart Button */}
                <div className="p-2.5 sm:p-3 pt-0 flex items-center justify-between gap-1.5 mt-1 border-t theme-border pt-2">
                  <div className="flex flex-col min-w-0 flex-1">
                    <span
                      className="text-xs sm:text-sm font-black tracking-tight leading-tight truncate transition-colors duration-300"
                      style={{ color: 'var(--accent-color, #6366f1)' }}
                    >
                      {formatPrice(finalPrice, currency, language)}
                    </span>
                    {hasDiscount && (
                      <span className="text-[10px] text-[var(--text-muted)] line-through font-mono leading-none mt-0.5 truncate">
                        {formatPrice(product.price, currency, language)}
                      </span>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={(e) => handleAddToCart(e, product, finalPrice)}
                    disabled={isOutOfStock}
                    title={
                      isOutOfStock
                        ? translations[language].productCard.outOfStock
                        : isAdded
                        ? translations[language].productCard.added
                        : translations[language].productCard.add
                    }
                    aria-label={
                      isOutOfStock
                        ? translations[language].productCard.outOfStock
                        : isAdded
                        ? translations[language].productCard.added
                        : translations[language].productCard.add
                    }
                    style={
                      isAdded
                        ? undefined
                        : isOutOfStock
                        ? undefined
                        : {
                            backgroundColor: 'var(--accent-color, #6366f1)',
                            boxShadow: '0 4px 14px -2px var(--accent-color, rgba(99, 102, 241, 0.35))',
                          }
                    }
                    className={`h-7 px-2 sm:h-8 sm:px-2.5 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all duration-300 flex-shrink-0 ${
                      isAdded
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105'
                        : isOutOfStock
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border theme-border'
                        : 'text-white active:scale-95 hover:scale-105 hover:brightness-110'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <FontAwesomeIcon icon={faCheck} className="text-[11px] animate-in zoom-in-50 duration-200" />
                        <span className="text-[10px] hidden xs:inline sm:inline">{translations[language].productCard.added}</span>
                      </>
                    ) : isOutOfStock ? (
                      <>
                        <FontAwesomeIcon icon={faBan} className="text-[11px]" />
                        <span className="text-[10px] hidden xs:inline sm:inline">{translations[language].productCard.outOfStock}</span>
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faCartPlus} className="text-[11px]" />
                        <span className="text-[10px] hidden xs:inline sm:inline">{translations[language].productCard.add}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

