'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useWishlist } from '@/store/useWishlistStore';
import { useCartStore } from '@/store/useCartStore';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { getProductUrl } from '@/lib/productUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeart,
  faTrash,
  faShoppingBag,
  faArrowRight,
  faCheck,
  faExclamationTriangle,
  faBan,
  faBoxes,
} from '@fortawesome/free-solid-svg-icons';

export default function WishlistPage() {
  const { items, removeItem, clearWishlist } = useWishlist();
  const { addItem } = useCartStore();
  const { language, currency } = useSettings();
  const t = translations[language].wishlist;
  const [addedIds, setAddedIds] = React.useState<Record<string, boolean>>({});

  const handleAddToCart = (item: any) => {
    if (item.stockQuantity <= 0) return;
    const success = addItem({
      id: item.id,
      title: item.title,
      price: item.price,
      image: item.image,
      stockQuantity: item.stockQuantity,
    });
    if (success) {
      setAddedIds((prev) => ({ ...prev, [item.id]: true }));
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [item.id]: false }));
      }, 1500);
    }
  };

  const handleMoveAllToCart = () => {
    items.forEach((item) => {
      if (item.stockQuantity > 0) {
        addItem({
          id: item.id,
          title: item.title,
          price: item.price,
          image: item.image,
          stockQuantity: item.stockQuantity,
        });
      }
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b theme-border mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-500 border border-rose-200 dark:border-rose-800/50">
              <FontAwesomeIcon icon={faHeart} className="text-lg" />
            </div>
            <h1 className="text-2xl font-black text-[var(--text-primary)]">{t.title}</h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{t.subtitle}</p>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleMoveAllToCart}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition active:scale-95"
            >
              <FontAwesomeIcon icon={faShoppingBag} />
              <span>{t.moveAllToCart}</span>
            </button>
            <button
              onClick={clearWishlist}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border theme-border text-[var(--text-secondary)] hover:text-rose-500 text-xs font-semibold hover:bg-[var(--bg-card)] transition"
            >
              <FontAwesomeIcon icon={faTrash} />
              <span>{t.remove}</span>
            </button>
          </div>
        )}
      </div>

      {/* Empty State */}
      {items.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border theme-border space-y-4 max-w-lg mx-auto my-12">
          <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-500 flex items-center justify-center text-2xl mx-auto shadow-inner border border-rose-200 dark:border-rose-800/40">
            <FontAwesomeIcon icon={faHeart} />
          </div>
          <h2 className="text-lg font-black text-[var(--text-primary)]">{t.empty}</h2>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{t.emptyDesc}</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/25 transition mt-2"
          >
            <FontAwesomeIcon icon={faBoxes} />
            <span>{t.browse}</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {items.map((item) => {
            const isOutOfStock = item.stockQuantity <= 0;
            const isAdded = addedIds[item.id];

            return (
              <div
                key={item.id}
                className="glass-card rounded-2xl overflow-hidden border theme-border flex flex-col justify-between group shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div>
                  <div className="relative aspect-square bg-gray-100 dark:bg-gray-950 overflow-hidden">
                    <Link href={getProductUrl(item)}>
                      <Image
                        src={item.image}
                        alt={item.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>

                    {/* Stock badge */}
                    <div className="absolute top-3 start-3 z-10">
                      {isOutOfStock ? (
                        <span className="bg-red-100/90 dark:bg-red-900/90 text-red-700 dark:text-red-200 text-[10px] font-bold px-2.5 py-1 rounded-full border border-red-300/50 flex items-center gap-1 backdrop-blur-md">
                          <FontAwesomeIcon icon={faBan} className="text-[10px]" />
                          <span>{translations[language].product.outOfStock}</span>
                        </span>
                      ) : (
                        <span className="bg-emerald-50/90 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200/50 backdrop-blur-md">
                          {translations[language].product.inStock}
                        </span>
                      )}
                    </div>

                    {/* Remove Wishlist Button */}
                    <button
                      onClick={() => removeItem(item.id)}
                      title="Remove"
                      className="absolute top-3 end-3 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-900/80 text-rose-500 hover:scale-110 flex items-center justify-center backdrop-blur-md shadow transition"
                    >
                      <FontAwesomeIcon icon={faTrash} className="text-xs" />
                    </button>
                  </div>

                  <div className="p-4 space-y-1">
                    <Link href={getProductUrl(item)}>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] hover:text-indigo-600 transition line-clamp-1">
                        {item.title}
                      </h3>
                    </Link>
                    <p className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                      {formatPrice(item.price, currency, language)}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    onClick={() => handleAddToCart(item)}
                    disabled={isOutOfStock}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm ${
                      isAdded
                        ? 'bg-emerald-500 text-white'
                        : isOutOfStock
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20 active:scale-95'
                    }`}
                  >
                    <FontAwesomeIcon icon={isAdded ? faCheck : faShoppingBag} />
                    <span>{isAdded ? translations[language].product.addedToCart : isOutOfStock ? translations[language].product.outOfStock : translations[language].product.addToCart}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
