'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useCartStore } from '@/store/useCartStore';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl, getAllImageUrls } from '@/lib/images';
import ProductCard from '@/components/ProductCard';
import CountdownTimer from '@/components/CountdownTimer';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus, faMinus, faShoppingBag, faCheck, faExclamationTriangle,
  faShieldHalved, faTruckFast, faRotateLeft, faBan,
} from '@fortawesome/free-solid-svg-icons';

import ProductReviews from '@/components/ProductReviews';
import ProductShareButtons from '@/components/ProductShareButtons';
import ProductRecommendations from '@/components/ProductRecommendations';
import RecentlyViewed from '@/components/RecentlyViewed';
import { useWishlist } from '@/store/useWishlistStore';
import { useRecentlyViewedStore } from '@/store/useRecentlyViewedStore';
import { useCompareStore } from '@/store/useCompareStore';
import { useToastStore } from '@/store/useToastStore';
import { faHeart as faHeartSolid, faCodeCompare } from '@fortawesome/free-solid-svg-icons';

interface ProductVariant {
  id: string;
  colorName: string;
  colorHex: string;
  stockQuantity: number;
  image?: string | null;
}

interface ProductDetailClientProps {
  product: {
    id: string; title: string; description: string; price: number;
    discountPercent?: number; stockQuantity: number; images: string;
    saleEndsAt?: string | Date | null;
    categories: { id: string; name: string; slug: string; parent?: { id: string; name: string; slug: string } | null }[];
    variants?: ProductVariant[];
  };
  relatedProducts: any[];
}

export default function ProductDetailClient({ product, relatedProducts }: ProductDetailClientProps) {
  const { addItem, toggleCartDrawer } = useCartStore();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { toggleCompare, isInCompare } = useCompareStore();
  const { addProduct: addRecentlyViewed } = useRecentlyViewedStore();
  const { language, currency } = useSettings();
  const t = translations[language].product;

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;

  const [selectedQty, setSelectedQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    hasVariants ? product.variants![0] : null
  );
  const [colorError, setColorError] = useState(false);

  // Active stock: from selected variant or overall product
  const activeStock = hasVariants
    ? (selectedVariant ? selectedVariant.stockQuantity : 0)
    : product.stockQuantity;

  const images = getAllImageUrls(product.images);
  if (!images.length) images.push(getImageUrl(null));

  const [activeIdx, setActiveIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 50, y: 50 });

  const categoryIds = useMemo(() => product.categories?.map((c) => c.id) || [], [product.id]);

  // Auto-record to recently viewed on mount
  useEffect(() => {
    if (product && product.id) {
      addRecentlyViewed({
        id: product.id,
        title: product.title,
        price: product.price,
        discountPercent: product.discountPercent,
        stockQuantity: product.stockQuantity,
        images: product.images,
        categories: product.categories,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  // Switch to variant image if variant has one
  useEffect(() => {
    if (selectedVariant?.image) {
      setActiveIdx(-1); // -1 = use variant image
    } else {
      setActiveIdx(0);
    }
  }, [selectedVariant]);

  // Reset qty when variant changes
  useEffect(() => {
    setSelectedQty(1);
    setColorError(false);
  }, [selectedVariant]);

  // Auto-scroll through images if multiple exist and user is not hovering
  useEffect(() => {
    if (activeIdx === -1 || images.length <= 1 || isPaused || isZoomed) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % images.length);
    }, 3500);
    return () => clearInterval(timer);
  }, [images.length, isPaused, isZoomed, activeIdx]);

  // The displayed image: variant image if selected, else gallery
  const activeImage = (activeIdx === -1 && selectedVariant?.image)
    ? selectedVariant.image
    : (images[activeIdx] || images[0]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomOrigin({ x, y });
  };

  const hasDiscount = Boolean(product.discountPercent && product.discountPercent > 0);
  const finalPrice = hasDiscount ? product.price * (1 - (product.discountPercent! / 100)) : product.price;

  const inWishlist = isInWishlist(product.id);
  const inCompare = isInCompare(product.id);

  const handleWishlistToggle = () => {
    toggleWishlist({
      id: product.id,
      title: product.title,
      price: finalPrice,
      discountPercent: product.discountPercent,
      image: activeImage,
      stockQuantity: product.stockQuantity,
    });
  };

  const handleCompareToggle = () => {
    const result = toggleCompare({
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.price,
      discountPercent: product.discountPercent,
      stockQuantity: product.stockQuantity,
      images: product.images,
      categories: product.categories,
      variants: product.variants,
    });

    const compT = translations[language].compare;
    if (result.maxReached) {
      useToastStore.getState().warning(compT.maxReached);
    } else if (result.added) {
      useToastStore.getState().success(compT.addedToCompare);
    } else {
      useToastStore.getState().info(compT.removedFromCompare);
    }
  };

  const handleAddToCart = () => {
    if (activeStock <= 0) return;
    if (hasVariants && !selectedVariant) {
      setColorError(true);
      return;
    }
    const success = addItem({
      id: product.id,
      title: product.title,
      price: finalPrice,
      image: activeImage,
      stockQuantity: activeStock,
      variantId: selectedVariant?.id,
      selectedColor: selectedVariant?.colorName,
    }, selectedQty);
    if (success) { setAdded(true); setTimeout(() => setAdded(false), 2000); }
  };

  const isLowStock = activeStock > 0 && activeStock < 10;
  const isOutOfStock = activeStock <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">

        {/* Gallery */}
        <div className="space-y-4">
          <div
            className="relative aspect-square rounded-3xl overflow-hidden border theme-border bg-gray-50 dark:bg-gray-950 shadow-sm cursor-zoom-in"
            onMouseEnter={() => { setIsPaused(true); setIsZoomed(true); }}
            onMouseLeave={() => { setIsPaused(false); setIsZoomed(false); }}
            onMouseMove={handleMouseMove}
          >
            <Image
              src={getImageUrl(activeImage)}
              alt={product.title}
              fill
              className="object-cover transition-transform duration-150 ease-out"
              style={
                isZoomed
                  ? { transformOrigin: `${zoomOrigin.x}% ${zoomOrigin.y}%`, transform: 'scale(2.2)' }
                  : { transform: 'scale(1)' }
              }
              priority
            />
            {hasDiscount && (
              <div className="absolute top-4 end-4 z-10 pointer-events-none">
                <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full shadow-lg shadow-rose-500/30 backdrop-blur-md border border-rose-400/40">
                  -{Math.round(product.discountPercent!)}% OFF
                </span>
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div
              className="flex gap-3 overflow-x-auto pb-2"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIdx(idx)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 transition flex-shrink-0 ${
                    activeIdx === idx
                      ? 'border-indigo-600 ring-2 ring-indigo-500/30 scale-105'
                      : 'border-[var(--border-color)] opacity-60 hover:opacity-100'
                  }`}
                >
                  <Image src={getImageUrl(img)} alt={`Thumbnail ${idx + 1}`} fill className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between gap-4 mb-3">
              {product.categories && product.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {product.categories.map((cat) => (
                    <Link
                      key={cat.id}
                      href={`/products?category=${cat.slug}`}
                      className="text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 dark:bg-indigo-950/80 px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-700/50 inline-block"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}

              {/* Action Buttons: Compare & Wishlist */}
              <div className="flex items-center gap-2">
                {/* Compare Button */}
                <button
                  onClick={handleCompareToggle}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm ${
                    inCompare
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700/60 text-indigo-600 dark:text-indigo-300'
                      : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-indigo-600'
                  }`}
                  title={inCompare ? 'Remove from compare' : 'Add to compare'}
                >
                  <FontAwesomeIcon icon={faCodeCompare} className={inCompare ? 'text-indigo-600' : 'text-gray-400'} />
                  <span>{inCompare ? t.inCompare : t.addToCompare}</span>
                </button>

                {/* Wishlist Button */}
                <button
                  onClick={handleWishlistToggle}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition shadow-sm ${
                    inWishlist
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-700/60 text-rose-600 dark:text-rose-300'
                      : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-secondary)] hover:text-rose-500'
                  }`}
                >
                  <FontAwesomeIcon icon={faHeartSolid} className={inWishlist ? 'text-rose-500' : 'text-gray-400'} />
                  <span>{inWishlist ? t.inWishlist : t.addToWishlist}</span>
                </button>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">{product.title}</h1>
          </div>

          {/* Price & Stock */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-y theme-border py-4">
            <div className="flex items-center gap-4">
              {hasDiscount ? (
                <div className="flex flex-wrap items-baseline gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                      {t.priceAfterDiscount}
                    </span>
                    <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                      {formatPrice(finalPrice, currency, language)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                      {t.originalPrice}
                    </span>
                    <span className="text-base text-[var(--text-muted)] line-through font-semibold font-mono">
                      {formatPrice(product.price, currency, language)}
                    </span>
                  </div>
                  <span className="bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-extrabold px-2.5 py-1 rounded-full shadow-sm">
                    -{Math.round(product.discountPercent!)}% {t.off}
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider block">
                    {t.price}
                  </span>
                  <span className="text-3xl font-black text-[var(--text-primary)] tracking-tight">
                    {formatPrice(product.price, currency, language)}
                  </span>
                </div>
              )}
            </div>
            {isOutOfStock ? (
              <span className="bg-red-50 dark:bg-red-950/90 text-red-600 dark:text-red-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-red-200 dark:border-red-700/50 flex items-center gap-1.5">
                <FontAwesomeIcon icon={faBan} /><span>{t.outOfStock}</span>
              </span>
            ) : isLowStock ? (
              <span className="bg-amber-50 dark:bg-amber-950/90 text-amber-600 dark:text-amber-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-amber-200 dark:border-amber-700/50 flex items-center gap-1.5 animate-pulse">
                <FontAwesomeIcon icon={faExclamationTriangle} /><span>{t.lowStock} {activeStock} {t.lowStockSuffix}</span>
              </span>
            ) : (
              <span className="bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-700/40 flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCheck} /><span>{t.inStock} ({activeStock} {t.units})</span>
              </span>
            )}
          </div>

          {/* Flash Sale Banner if saleEndsAt is active */}
          {product.saleEndsAt && new Date(product.saleEndsAt).getTime() > Date.now() && (
            <CountdownTimer targetDate={product.saleEndsAt} />
          )}

          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{product.description}</p>

          {/* ── Color Variant Selector ── */}
          {hasVariants && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t.selectColor}</span>
                {selectedVariant && (
                  <span className="text-xs font-bold text-[var(--text-primary)] bg-[var(--bg-surface)] border theme-border px-3 py-1 rounded-full">
                    {selectedVariant.colorName}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {product.variants!.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  const isVarOutOfStock = variant.stockQuantity <= 0;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => { setSelectedVariant(variant); setColorError(false); }}
                      disabled={isVarOutOfStock}
                      title={`${variant.colorName}${isVarOutOfStock ? ` — ${t.outOfStock}` : ` (${variant.stockQuantity} ${t.units})`}`}
                      className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all duration-200 text-xs font-bold ${
                        isVarOutOfStock
                          ? 'opacity-40 cursor-not-allowed border-[var(--border-color)]'
                          : isSelected
                          ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50 dark:bg-indigo-950/60 scale-105 shadow-md'
                          : 'border-[var(--border-color)] hover:border-indigo-400 bg-[var(--bg-surface)] hover:scale-105'
                      }`}
                    >
                      {/* Color dot */}
                      <span
                        className="w-5 h-5 rounded-full border border-white dark:border-gray-600 shadow-sm flex-shrink-0"
                        style={{ background: variant.colorHex }}
                      />
                      <span className="text-[var(--text-primary)]">{variant.colorName}</span>
                      {isVarOutOfStock && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-full h-0.5 bg-red-400/60 absolute rotate-[-30deg]" />
                        </span>
                      )}
                      {isSelected && !isVarOutOfStock && (
                        <FontAwesomeIcon icon={faCheck} className="text-indigo-600 text-[10px]" />
                      )}
                    </button>
                  );
                })}
              </div>
              {colorError && (
                <p className="text-xs font-semibold text-rose-500 animate-pulse">
                  ⚠ {t.pleaseSelectColor}
                </p>
              )}
            </div>
          )}

          {!isOutOfStock && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">{t.quantity}</span>
                <div className="flex items-center gap-3 bg-[var(--bg-surface)] border theme-border px-3 py-1.5 rounded-xl">
                  <button onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
                    <FontAwesomeIcon icon={faMinus} className="text-xs" />
                  </button>
                  <span className="text-sm font-bold text-[var(--text-primary)] w-6 text-center">{selectedQty}</span>
                  <button onClick={() => setSelectedQty(Math.min(activeStock, selectedQty + 1))} className="p-1 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition">
                    <FontAwesomeIcon icon={faPlus} className="text-xs" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  onClick={handleAddToCart}
                  style={
                    added
                      ? undefined
                      : {
                          backgroundColor: 'var(--accent-color, #6366f1)',
                          boxShadow: '0 10px 25px -5px var(--accent-color, rgba(99, 102, 241, 0.35))',
                        }
                  }
                  className={`flex-1 py-4 rounded-xl font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all duration-300 ${added ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'text-white hover:brightness-110 active:scale-95'}`}
                >
                  {added ? (
                    <><FontAwesomeIcon icon={faCheck} /><span>{t.added}</span></>
                  ) : (
                    <><FontAwesomeIcon icon={faShoppingBag} /><span>{t.addToCart} — {formatPrice(finalPrice * selectedQty, currency, language)}</span></>
                  )}
                </button>
                <button
                  onClick={() => { handleAddToCart(); toggleCartDrawer(true); }}
                  className="px-6 py-4 bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] border theme-border font-bold text-sm rounded-xl transition"
                >
                  {t.buyNow}
                </button>
              </div>
            </div>
          )}

          {/* Perks */}
          <div className="grid grid-cols-3 gap-3 border-t theme-border pt-6 text-center">
            {[
              { icon: faTruckFast, label: t.fastDispatch },
              { icon: faShieldHalved, label: t.warranty },
              { icon: faRotateLeft, label: t.returns },
            ].map((perk, i) => (
              <div key={i} className="p-3 bg-[var(--bg-surface)] rounded-xl border theme-border hover:border-indigo-300 dark:hover:border-indigo-700 transition">
                <FontAwesomeIcon icon={perk.icon} className="text-indigo-500 text-lg mb-1" />
                <span className="block text-[11px] text-[var(--text-secondary)] font-medium">{perk.label}</span>
              </div>
            ))}
          </div>

          {/* Social Sharing & Copy Link */}
          <ProductShareButtons title={product.title} />
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="space-y-6 pt-8 border-t theme-border">
          <h2 className="text-2xl font-extrabold text-[var(--text-primary)] tracking-tight">{t.relatedProducts}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.map((rel) => <ProductCard key={rel.id} product={rel} />)}
          </div>
        </div>
      )}

      {/* Product Reviews & Ratings */}
      <ProductReviews productId={product.id} />

      {/* AI / Category Product Recommendations */}
      <ProductRecommendations
        productId={product.id}
        categoryIds={categoryIds}
      />

      {/* Recently Viewed Products */}
      <RecentlyViewed currentProductId={product.id} />

    </div>
  );
}

