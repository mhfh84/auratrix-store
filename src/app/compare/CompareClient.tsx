'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCompareStore, CompareProduct } from '@/store/useCompareStore';
import { useCartStore } from '@/store/useCartStore';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl } from '@/lib/images';
import { getProductUrl } from '@/lib/productUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCodeCompare,
  faXmark,
  faCheck,
  faShoppingBag,
  faPlus,
  faTrashCan,
  faStar,
  faBan,
  faExclamationTriangle,
  faArrowRight,
  faLayerGroup,
  faSearch,
} from '@fortawesome/free-solid-svg-icons';

interface CompareClientProps {
  allCatalogProducts: any[];
}

export default function CompareClient({ allCatalogProducts }: CompareClientProps) {
  const { items, removeFromCompare, clearCompare, addToCompare } = useCompareStore();
  const { addItem } = useCartStore();
  const { language, currency, serverSettings } = useSettings();
  const t = translations[language].compare;
  const isRTL = language === 'ar';

  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddToCart = (product: CompareProduct) => {
    if (product.stockQuantity <= 0) return;
    const finalPrice = product.discountPercent && product.discountPercent > 0
      ? product.price * (1 - product.discountPercent / 100)
      : product.price;

    const success = addItem({
      id: product.id,
      title: product.title,
      price: finalPrice,
      image: getImageUrl(product.images),
      stockQuantity: product.stockQuantity,
    });

    if (success) {
      setAddedItems((prev) => ({ ...prev, [product.id]: true }));
      setTimeout(() => {
        setAddedItems((prev) => ({ ...prev, [product.id]: false }));
      }, 2000);
    }
  };

  // Find lowest price among compared items to highlight
  const lowestPrice = items.length > 1
    ? Math.min(
        ...items.map((p) =>
          p.discountPercent && p.discountPercent > 0
            ? p.price * (1 - p.discountPercent / 100)
            : p.price
        )
      )
    : null;

  // Filter catalog products for adding more items to compare
  const availableToAdd = allCatalogProducts.filter(
    (p) => !items.some((item) => item.id === p.id) &&
      (searchQuery === '' ||
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10" dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b theme-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <FontAwesomeIcon icon={faCodeCompare} />
            </div>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              {t.title}
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
            {t.title}
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] mt-1 max-w-2xl">
            {t.subtitle}
          </p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-3">
            {items.length < 4 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 font-bold text-xs rounded-xl border border-indigo-200 dark:border-indigo-800 transition flex items-center gap-1.5"
              >
                <FontAwesomeIcon icon={faPlus} />
                <span>{t.addMore} ({items.length}/4)</span>
              </button>
            )}

            <button
              onClick={clearCompare}
              className="px-4 py-2.5 bg-[var(--bg-surface)] hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[var(--text-muted)] hover:text-rose-600 font-bold text-xs rounded-xl border theme-border transition flex items-center gap-1.5"
            >
              <FontAwesomeIcon icon={faTrashCan} />
              <span>{t.clearAll}</span>
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="text-center py-20 px-4 glass-card rounded-3xl border theme-border space-y-6 max-w-xl mx-auto shadow-sm">
          <div className="w-20 h-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-3xl mx-auto border border-indigo-200 dark:border-indigo-800 shadow-inner">
            <FontAwesomeIcon icon={faCodeCompare} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[var(--text-primary)]">
              {t.emptyTitle}
            </h2>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              {t.emptyDesc}
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition active:scale-95"
          >
            <span>{t.browseCatalog}</span>
            <FontAwesomeIcon icon={faArrowRight} className={isRTL ? 'rotate-180 text-xs' : 'text-xs'} />
          </Link>
        </div>
      ) : (
        /* Side-by-Side Comparison Table Grid */
        <div className="overflow-x-auto pb-6">
          <div
            className="grid gap-4 min-w-[700px]"
            style={{
              gridTemplateColumns: `repeat(${items.length}, minmax(240px, 1fr))`,
            }}
          >
            {items.map((product) => {
              const hasDiscount = Boolean(product.discountPercent && product.discountPercent > 0);
              const finalPrice = hasDiscount
                ? product.price * (1 - product.discountPercent! / 100)
                : product.price;
              const isBestPrice = lowestPrice !== null && finalPrice === lowestPrice;
              const isLowStock = product.stockQuantity > 0 && product.stockQuantity < (serverSettings?.lowStockThreshold || 10);
              const isOutOfStock = product.stockQuantity <= 0;
              const isAdded = Boolean(addedItems[product.id]);

              return (
                <div
                  key={product.id}
                  className="glass-card rounded-2xl border theme-border overflow-hidden flex flex-col justify-between shadow-md hover:shadow-xl transition-all duration-300 relative bg-[var(--bg-surface)]"
                >
                  {/* Remove Button */}
                  <button
                    onClick={() => removeFromCompare(product.id)}
                    className="absolute top-3 end-3 z-20 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-900/90 text-gray-400 hover:text-rose-500 border theme-border flex items-center justify-center text-xs backdrop-blur-md shadow-md transition"
                    title={t.remove}
                  >
                    <FontAwesomeIcon icon={faXmark} />
                  </button>

                  <div className="space-y-4">
                    {/* Image */}
                    <div className="relative aspect-square bg-gray-100 dark:bg-gray-950 overflow-hidden">
                      <Image
                        src={getImageUrl(product.images)}
                        alt={product.title}
                        fill
                        className="object-cover hover:scale-105 transition-transform duration-500"
                      />
                      {isBestPrice && items.length > 1 && (
                        <div className="absolute top-3 start-3 z-10">
                          <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shadow-lg shadow-emerald-500/40 backdrop-blur-md">
                            ★ {t.bestPrice}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Title & Categories */}
                    <div className="p-4 pt-0 space-y-2">
                      {product.categories && product.categories.length > 0 && (
                        <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest block">
                          {product.categories[0].name}
                        </span>
                      )}
                      <Link href={getProductUrl(product)}>
                        <h3 className="text-base font-bold text-[var(--text-primary)] hover:text-indigo-600 transition line-clamp-2 leading-snug">
                          {product.title}
                        </h3>
                      </Link>

                      {/* Rating */}
                      <div className="flex items-center gap-1.5 pt-1 text-xs">
                        <FontAwesomeIcon icon={faStar} className="text-amber-400 text-xs" />
                        <span className="font-extrabold text-[var(--text-primary)]">
                          {(product.averageRating || 5.0).toFixed(1)}
                        </span>
                        {product.ratingCount !== undefined && product.ratingCount > 0 && (
                          <span className="text-[11px] text-[var(--text-muted)]">
                            ({product.ratingCount})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Specifications & Attributes Comparison Section */}
                    <div className="border-t theme-border p-4 space-y-4 text-xs">
                      
                      {/* Price Section */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                          {t.price}
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                            {formatPrice(finalPrice, currency, language)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs text-[var(--text-muted)] line-through font-mono">
                              {formatPrice(product.price, currency, language)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Stock Status */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                          {t.availability}
                        </span>
                        {isOutOfStock ? (
                          <span className="inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                            <FontAwesomeIcon icon={faBan} />
                            <span>{t.outOfStock}</span>
                          </span>
                        ) : isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold">
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                            <span>{t.lowStock} ({product.stockQuantity})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                            <FontAwesomeIcon icon={faCheck} />
                            <span>{t.inStock} ({product.stockQuantity})</span>
                          </span>
                        )}
                      </div>

                      {/* Color Variants (if any) */}
                      {product.variants && product.variants.length > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                            {t.colors} ({product.variants.length})
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {product.variants.map((v) => (
                              <span
                                key={v.id}
                                className="w-5 h-5 rounded-full border-2 border-white dark:border-gray-700 shadow-sm inline-block"
                                style={{ background: v.colorHex }}
                                title={v.colorName}
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Description / Summary */}
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block">
                          {t.description}
                        </span>
                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-3">
                          {product.description}
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* Actions (Add to Cart / View) */}
                  <div className="p-4 pt-2 border-t theme-border space-y-2">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={isOutOfStock}
                      className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-300 shadow-md ${
                        isAdded
                          ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                          : isOutOfStock
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed border theme-border'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <FontAwesomeIcon icon={faCheck} />
                          <span>{t.addedToCart}</span>
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faShoppingBag} />
                          <span>{t.addToCart}</span>
                        </>
                      )}
                    </button>

                    <Link
                      href={getProductUrl(product)}
                      className="block text-center py-2 text-xs font-bold text-[var(--text-secondary)] hover:text-indigo-600 transition"
                    >
                      {t.viewProduct}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Product Modal (Pick from Catalog) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-surface)] border theme-border rounded-3xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b theme-border">
              <h3 className="text-lg font-black text-[var(--text-primary)]">
                {t.selectProductToCompare}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-[var(--bg-card)] border theme-border flex items-center justify-center text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <FontAwesomeIcon icon={faXmark} />
              </button>
            </div>

            {/* Search Input */}
            <div className="py-4">
              <div className="relative">
                <FontAwesomeIcon icon={faSearch} className="absolute inset-y-0 start-3.5 my-auto text-gray-400 text-xs" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full text-xs ps-9 pe-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Products List */}
            <div className="flex-1 overflow-y-auto space-y-2 pe-1">
              {availableToAdd.length === 0 ? (
                <div className="text-center py-10 text-xs text-[var(--text-muted)]">
                  {t.noMatchingProducts}
                </div>
              ) : (
                availableToAdd.map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between p-3 rounded-2xl border theme-border hover:bg-[var(--bg-card)] transition gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-950 flex-shrink-0">
                        <Image src={getImageUrl(prod.images)} alt={prod.title} fill className="object-cover" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[var(--text-primary)] line-clamp-1">{prod.title}</h4>
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                          {formatPrice(prod.price, currency, language)}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const added = addToCompare({
                          id: prod.id,
                          title: prod.title,
                          description: prod.description,
                          price: prod.price,
                          discountPercent: prod.discountPercent,
                          stockQuantity: prod.stockQuantity,
                          images: prod.images,
                          categories: prod.categories,
                          variants: prod.variants,
                          averageRating: prod.averageRating,
                          ratingCount: prod.ratingCount,
                        });
                        if (added) {
                          setShowAddModal(false);
                        }
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faPlus} className="text-xs" />
                      <span>{t.compareNow}</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
