'use client';

import React, { useState, useMemo } from 'react';
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
  faBolt,
  faArrowRight,
  faHeart as faHeartSolid,
  faCodeCompare,
  faCartPlus,
  faCheck,
  faBan,
} from '@fortawesome/free-solid-svg-icons';
import type { ProductData } from '@/types/models';

interface NewArrivalsCarouselProps {
  products: ProductData[];
}

export default function NewArrivalsCarousel({ products }: NewArrivalsCarouselProps) {
  const { language, currency } = useSettings();
  const { addItem } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompareStore();
  const t = translations[language].home;
  const isRTL = language === 'ar';

  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});

  // Generate seamless repeated item list for carousel to eliminate any blank/empty space
  const carouselItems = useMemo(() => {
    if (!products || products.length === 0) return [];
    let list = [...products];
    while (list.length < 16) {
      list = [...list, ...products];
    }
    return list;
  }, [products]);

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

  const handleWishlistToggle = (e: React.MouseEvent, product: any, finalPrice: number) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      id: product.id,
      title: product.title,
      price: finalPrice,
      image: getImageUrl(product.images),
      stockQuantity: product.stockQuantity ?? 10,
    });
  };

  const handleCompareToggle = (e: React.MouseEvent, product: any) => {
    e.preventDefault();
    e.stopPropagation();
    toggleCompare(product);
  };

  if (carouselItems.length === 0) return null;

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Section header */}
      <div className="flex justify-between items-end">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/50 rounded-lg">
              <FontAwesomeIcon icon={faBolt} className="text-emerald-500 text-xs" />
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              {translations[language].home.newBadge}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">
            {t.newArrivals}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {t.newArrivalsDesc}
          </p>
        </div>
        <Link
          href="/products?sort=newest"
          className="text-xs font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1"
        >
          <span>{t.viewAll}</span>
          <FontAwesomeIcon icon={faArrowRight} className={isRTL ? 'rotate-180' : ''} />
        </Link>
      </div>

      {/* Carousel track — overflow clipped, gradient fades on edges */}
      <div className="relative overflow-hidden rounded-2xl min-h-[250px]">
        {/* Left fade */}
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[var(--bg-primary)] to-transparent pointer-events-none z-10" />
        {/* Right fade */}
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[var(--bg-primary)] to-transparent pointer-events-none z-10" />

        {/* Scrolling track — two identical groups for seamless infinite loop */}
        <div
          className={`flex py-2 ${isRTL ? 'carousel-track-rtl' : 'carousel-track-ltr'}`}
          style={{ width: 'max-content' }}
        >
          {[0, 1].map((groupIndex) => (
            <div
              key={groupIndex}
              className="flex gap-4 pe-4 flex-shrink-0"
              aria-hidden={groupIndex === 1 ? 'true' : undefined}
            >
              {carouselItems.map((product, i) => {
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
                    key={`${product.id}-${groupIndex}-${i}`}
                    className="group flex-shrink-0 w-[155px] xs:w-[170px] sm:w-52 rounded-2xl overflow-hidden border theme-border hover:shadow-xl transition-all duration-300 flex flex-col justify-between bg-[var(--bg-surface)] text-[var(--text-primary)]"
                    style={{ backgroundColor: 'var(--bg-surface)' }}
                  >
                    {/* Top: Image & Overlay Actions */}
                    <div>
                      <div className="relative w-full aspect-square bg-gray-100 dark:bg-gray-950 overflow-hidden">
                        <Link href={getProductUrl(product)} className="block w-full h-full">
                          <Image
                            src={getImageUrl(product.images)}
                            alt={product.title}
                            fill
                            sizes="(max-width: 640px) 160px, 208px"
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        </Link>

                        {/* Top Start: Stock Badge & Discount Badge */}
                        <div className="absolute top-2 start-2 flex flex-col gap-1 z-10">
                          {isOutOfStock ? (
                            <span className="bg-red-600/95 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-red-400/50 backdrop-blur-md flex items-center gap-1 shadow-sm">
                              <FontAwesomeIcon icon={faBan} className="text-[9px]" />
                              <span>{translations[language].product.outOfStock}</span>
                            </span>
                          ) : (
                            <span className="bg-emerald-500/90 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full backdrop-blur-sm shadow-sm">
                              {translations[language].home.newBadge}
                            </span>
                          )}
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
                            title={inCompare ? translations[language].compare.remove : translations[language].compare.add}
                            aria-label="Toggle compare"
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

                      {/* Info */}
                      <div className="p-2.5 sm:p-3 space-y-1">
                        <Link href={getProductUrl(product)}>
                          <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] line-clamp-2 min-h-[2rem] sm:min-h-[2.5rem] hover:text-[var(--accent-color,#6366f1)] transition-colors leading-snug">
                            {product.title}
                          </h3>
                        </Link>
                      </div>
                    </div>

                    {/* Bottom: Price & Quick Add Button */}
                    <div className="p-2.5 sm:p-3 pt-0 flex items-center justify-between gap-1.5">
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-black font-mono leading-tight" style={{ color: 'var(--accent-color, #6366f1)' }}>
                          {formatPrice(finalPrice, currency, language)}
                        </div>
                        {hasDiscount && (
                          <div className="text-[10px] text-gray-400 line-through font-mono">
                            {formatPrice(product.price, currency, language)}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={(e) => handleAddToCart(e, product, finalPrice)}
                        disabled={isOutOfStock}
                        title={isOutOfStock ? translations[language].product.outOfStock : translations[language].product.addToCart}
                        aria-label="Add to cart"
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
                            : 'text-white active:scale-95 hover:scale-105 hover:brightness-110 cursor-pointer'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <FontAwesomeIcon icon={faCheck} className="text-[11px] animate-in zoom-in-50 duration-200" />
                            <span className="text-[10px] hidden xs:inline sm:inline">{translations[language].product.addedToCart}</span>
                          </>
                        ) : isOutOfStock ? (
                          <>
                            <FontAwesomeIcon icon={faBan} className="text-[11px]" />
                            <span className="text-[10px] hidden xs:inline sm:inline">{translations[language].product.outOfStock}</span>
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faCartPlus} className="text-[11px]" />
                            <span className="text-[10px] hidden xs:inline sm:inline">{translations[language].product.addToCart}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
