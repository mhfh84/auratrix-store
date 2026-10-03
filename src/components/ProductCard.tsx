'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CountdownTimer from '@/components/CountdownTimer';
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
import { faCheck, faExclamationTriangle, faBan, faStar, faHeart as faHeartSolid, faCodeCompare, faCartPlus } from '@fortawesome/free-solid-svg-icons';

interface ProductVariant {
  id: string;
  colorName: string;
  colorHex: string;
  stockQuantity: number;
}

interface ProductCardProps {
  product: {
    id: string;
    title: string;
    description: string;
    price: number;
    discountPercent?: number;
    stockQuantity: number;
    images: string;
    averageRating?: number;
    ratingCount?: number;
    saleEndsAt?: string | Date | null;
    categories?: { id: string; name: string; slug: string }[];
    variants?: ProductVariant[];
  };
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompareStore();
  const { language, currency, serverSettings } = useSettings();
  const t = translations[language].productCard;
  const compT = translations[language].compare;
  const [added, setAdded] = useState(false);

  const coverImage = getImageUrl(product.images);

  const hasDiscount = Boolean(product.discountPercent && product.discountPercent > 0);
  const finalPrice = hasDiscount ? product.price * (1 - (product.discountPercent! / 100)) : product.price;

  const inWishlist = isInWishlist(product.id);
  const inCompare = isInCompare(product.id);

  const isFlashSale = product.saleEndsAt && new Date(product.saleEndsAt).getTime() > Date.now();

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist({
      id: product.id,
      title: product.title,
      price: finalPrice,
      discountPercent: product.discountPercent,
      image: coverImage,
      stockQuantity: product.stockQuantity,
    });
  };

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const result = toggleCompare({
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      discountPercent: product.discountPercent,
      stockQuantity: product.stockQuantity,
      images: product.images,
      averageRating: product.averageRating,
      ratingCount: product.ratingCount,
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

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (product.stockQuantity <= 0) return;
    const success = addItem({ id: product.id, title: product.title, price: finalPrice, image: coverImage, stockQuantity: product.stockQuantity });
    if (success) { setAdded(true); setTimeout(() => setAdded(false), 1800); }
  };

  const lowStockThreshold = serverSettings?.lowStockThreshold || 10;
  const isLowStock = product.stockQuantity > 0 && product.stockQuantity < lowStockThreshold;
  const isOutOfStock = product.stockQuantity <= 0;

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col justify-between group h-full border theme-border hover:shadow-xl transition-all duration-300 bg-[var(--bg-surface)] text-[var(--text-primary)]"
      style={{ backgroundColor: 'var(--bg-surface)' }}
    >
      <div>
        <div className="relative aspect-square bg-gray-100 dark:bg-gray-950 overflow-hidden">
          <Link href={getProductUrl(product)} className="block w-full h-full">
            <Image src={coverImage} alt={product.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
          </Link>

          {/* Top Start: Stock Badges */}
          <div className="absolute top-2.5 start-2.5 flex flex-col gap-1 z-10">
            {isOutOfStock ? (
              <span className="bg-red-100/90 dark:bg-red-900/90 text-red-700 dark:text-red-200 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-red-300/50 dark:border-red-700/50 backdrop-blur-md flex items-center gap-1 shadow-sm">
                <FontAwesomeIcon icon={faBan} className="text-[9px]" />
                <span>{t.outOfStock}</span>
              </span>
            ) : isLowStock ? (
              <span className="bg-amber-100/90 dark:bg-amber-900/90 text-amber-700 dark:text-amber-200 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-amber-300/50 dark:border-amber-700/50 backdrop-blur-md flex items-center gap-1 shadow-sm">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-[9px]" />
                <span>{t.lowStock} {product.stockQuantity} {t.lowStockSuffix}</span>
              </span>
            ) : (
              <span className="bg-emerald-50/90 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-700/40 backdrop-blur-md shadow-sm">
                {t.inStock}
              </span>
            )}
            {isFlashSale && (
              <CountdownTimer targetDate={product.saleEndsAt!} compact />
            )}
          </div>

          {/* Top End: Floating Action Buttons (Wishlist, Compare & Discount Badge) */}
          <div className="absolute top-2.5 end-2.5 flex flex-col items-center gap-1.5 z-10">
            {/* Wishlist Button */}
            <button
              onClick={handleWishlistToggle}
              title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-label="Toggle wishlist"
              className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all duration-300 shadow-lg ${
                inWishlist
                  ? 'bg-rose-500 text-white border-rose-400 scale-110 shadow-rose-500/40'
                  : 'bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 border-gray-200/90 dark:border-gray-700 hover:text-rose-500 hover:border-rose-300 hover:scale-115 hover:bg-rose-50 dark:hover:bg-rose-950/40 shadow-black/15'
              }`}
            >
              <FontAwesomeIcon icon={faHeartSolid} className="text-xs sm:text-sm" />
            </button>

            {/* Compare Button */}
            <button
              onClick={handleCompareToggle}
              title={inCompare ? compT.removeFromCompare : compT.addToCompare}
              aria-label={inCompare ? compT.removeFromCompare : compT.addToCompare}
              style={inCompare ? { backgroundColor: 'var(--accent-color, #6366f1)', borderColor: 'var(--accent-color, #6366f1)' } : undefined}
              className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all duration-300 shadow-lg ${
                inCompare
                  ? 'text-white scale-110 shadow-indigo-500/40'
                  : 'bg-white/95 dark:bg-gray-900/95 text-gray-700 dark:text-gray-200 border-gray-200/90 dark:border-gray-700 hover:text-[var(--accent-color,#6366f1)] hover:border-indigo-300 hover:scale-115 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 shadow-black/15'
              }`}
            >
              <FontAwesomeIcon icon={faCodeCompare} className="text-[11px] sm:text-xs" />
            </button>

            {hasDiscount && (
              <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full shadow-lg shadow-rose-500/30 backdrop-blur-md border border-rose-400/40">
                -{Math.round(product.discountPercent!)}%
              </span>
            )}
          </div>

          {/* Bottom Start: Category Pill Badge with Glassmorphism */}
          {product.categories && product.categories.length > 0 && (
            <span className="absolute bottom-2.5 start-2.5 bg-white/95 dark:bg-gray-900/95 text-gray-800 dark:text-gray-100 text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-xl border border-gray-200/90 dark:border-gray-700 shadow-md shadow-black/10 flex items-center gap-1.5 z-10">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
              <span>{product.categories[0].name}{product.categories.length > 1 ? ` +${product.categories.length - 1}` : ''}</span>
            </span>
          )}

          {/* Color variant swatches preview */}
          {product.variants && product.variants.length > 0 && (
            <div className="absolute bottom-2.5 end-2.5 flex items-center gap-1">
              {product.variants.slice(0, 4).map((v) => (
                <span
                  key={v.id}
                  className="w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 shadow-sm flex-shrink-0"
                  style={{ background: v.colorHex }}
                  title={v.colorName}
                />
              ))}
              {product.variants.length > 4 && (
                <span className="text-[8px] font-bold text-white bg-black/60 backdrop-blur-sm px-1 py-0.5 rounded-full">
                  +{product.variants.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="p-3 sm:p-4 space-y-1">
          {/* Rating Display */}
          {product.averageRating !== undefined && product.averageRating > 0 && (
            <div className="flex items-center gap-1 text-[11px]">
              <FontAwesomeIcon icon={faStar} className="text-amber-400 text-[10px]" />
              <span className="font-bold text-[var(--text-primary)]">{product.averageRating.toFixed(1)}</span>
              {product.ratingCount !== undefined && product.ratingCount > 0 && (
                <span className="text-[10px] text-[var(--text-muted)]">({product.ratingCount})</span>
              )}
            </div>
          )}

          <Link href={getProductUrl(product)}>
            <h3 className="text-xs sm:text-sm font-bold text-[var(--text-primary)] hover:text-[var(--accent-color,#6366f1)] transition-colors line-clamp-1 leading-snug">
              {product.title}
            </h3>
          </Link>
          <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1 leading-relaxed">
            {product.description}
          </p>
        </div>
      </div>

      <div className="p-3 sm:p-4 pt-0 flex items-center justify-between gap-1.5 sm:gap-2 mt-1 border-t theme-border pt-2.5">
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider block font-medium leading-none mb-0.5">{t.price}</span>
          <span
            className="text-xs sm:text-base font-black tracking-tight truncate leading-tight transition-colors duration-300"
            style={{ color: 'var(--accent-color, #6366f1)' }}
          >
            {formatPrice(finalPrice, currency, language)}
          </span>
          {hasDiscount && (
            <span className="text-[10px] sm:text-[11px] text-[var(--text-muted)] line-through font-semibold font-mono truncate leading-none mt-0.5">
              {formatPrice(product.price, currency, language)}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <button
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          title={isOutOfStock ? t.outOfStock : (added ? t.added : t.add)}
          aria-label={added ? t.added : t.add}
          style={
            added
              ? undefined
              : isOutOfStock
              ? undefined
              : {
                  backgroundColor: 'var(--accent-color, #6366f1)',
                  boxShadow: '0 4px 14px -2px var(--accent-color, rgba(99, 102, 241, 0.35))',
                }
          }
          className={`h-7 px-2.5 sm:h-9 sm:px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all duration-300 flex-shrink-0 ${
            added
              ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105'
              : isOutOfStock
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border theme-border'
              : 'text-white active:scale-95 hover:scale-105 hover:brightness-110'
          }`}
        >
          {added ? (
            <>
              <FontAwesomeIcon icon={faCheck} className="text-xs animate-in zoom-in-50 duration-200" />
              <span className="text-[11px] hidden xs:inline sm:inline">{t.added}</span>
            </>
          ) : isOutOfStock ? (
            <>
              <FontAwesomeIcon icon={faBan} className="text-xs" />
              <span className="text-[11px] hidden xs:inline sm:inline">{t.outOfStock}</span>
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faCartPlus} className="text-xs" />
              <span className="text-[11px] hidden xs:inline sm:inline">{t.add}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}


