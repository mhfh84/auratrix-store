'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useCart, useCartStore } from '@/store/useCartStore';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl } from '@/lib/images';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faShoppingBag, faTrash, faPlus, faMinus, faArrowRight,
  faExclamationTriangle, faCircleInfo,
} from '@fortawesome/free-solid-svg-icons';

export default function CartDrawer() {
  const { items, getTotalAmount } = useCart();
  const { isCartDrawerOpen, toggleCartDrawer, removeItem, updateQuantity, validateCart } = useCartStore();
  const { language, currency } = useSettings();
  const t = translations[language].cart;

  // Validate cart prices/stock whenever the drawer opens
  useEffect(() => {
    if (isCartDrawerOpen && items.length > 0) {
      validateCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartDrawerOpen]);

  const hasStaleItems = items.some((i) => i.priceStale);
  const hasOutOfStockItems = items.some((i) => i.outOfStock);

  if (!isCartDrawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
        onClick={() => toggleCartDrawer(false)}
      />
      <div className={`fixed inset-y-0 ${language === 'ar' ? 'left-0' : 'right-0'} max-w-full flex ${language === 'ar' ? 'pr-10' : 'pl-10'}`}>
        <div className="w-screen max-w-md bg-[var(--bg-surface)] shadow-2xl border-e theme-border flex flex-col justify-between">

          {/* Header */}
          <div className="p-6 border-b theme-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FontAwesomeIcon icon={faShoppingBag} className="text-indigo-500 text-xl" />
              <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">{t.title}</h2>
              <span className="bg-indigo-50 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-700/50">
                {items.reduce((acc, i) => acc + i.quantity, 0)} {t.items}
              </span>
            </div>
            <button
              onClick={() => toggleCartDrawer(false)}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] rounded-lg transition"
            >
              <FontAwesomeIcon icon={faTimes} className="text-lg" />
            </button>
          </div>

          {/* Stale price / out-of-stock banners */}
          {hasStaleItems && (
            <div className="mx-4 mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 text-xs font-semibold flex items-start gap-2">
              <FontAwesomeIcon icon={faCircleInfo} className="mt-0.5 flex-shrink-0" />
              <span>
                {language === 'ar'
                  ? 'تم تحديث سعر بعض المنتجات. المجموع يعكس الأسعار الحالية.'
                  : 'Some item prices were updated. The total now reflects current prices.'}
              </span>
            </div>
          )}
          {hasOutOfStockItems && (
            <div className="mx-4 mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-start gap-2">
              <FontAwesomeIcon icon={faExclamationTriangle} className="mt-0.5 flex-shrink-0" />
              <span>
                {language === 'ar'
                  ? 'بعض المنتجات نفد مخزونها. يرجى إزالتها قبل إتمام الطلب.'
                  : 'Some items are out of stock. Please remove them before checkout.'}
              </span>
            </div>
          )}

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-[var(--text-muted)]">
                <FontAwesomeIcon icon={faShoppingBag} className="text-5xl mb-4 text-[var(--text-muted)]" />
                <p className="text-lg font-medium text-[var(--text-primary)]">{t.empty}</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{t.emptyDesc}</p>
                <button
                  onClick={() => toggleCartDrawer(false)}
                  className="mt-6 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-sm transition"
                >
                  {t.browseCatalog}
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={`${item.id}-${item.variantId || 'default'}`}
                  className={`flex items-center gap-4 border p-3.5 rounded-xl transition ${
                    item.outOfStock
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-800 opacity-75'
                      : item.priceStale
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                      : 'bg-[var(--bg-card)] theme-border hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-950 flex-shrink-0">
                    <Image src={getImageUrl(item.image)} alt={item.title} fill className="object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate">{item.title}</h3>
                    {item.selectedColor && (
                      <span className="inline-flex items-center gap-1 mt-0.5 text-[10px] font-semibold text-[var(--text-secondary)] bg-[var(--bg-primary)] border theme-border px-2 py-0.5 rounded-full">
                        {t.color} {item.selectedColor}
                      </span>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-sm font-bold text-indigo-600">{formatPrice(item.price, currency, language)}</p>
                      {item.priceStale && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-full">
                          {language === 'ar' ? 'محدّث' : 'Updated'}
                        </span>
                      )}
                      {item.outOfStock && (
                        <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900/40 px-1.5 py-0.5 rounded-full">
                          {language === 'ar' ? 'نفد' : 'Out of stock'}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1, item.variantId)}
                        className="w-6 h-6 rounded bg-[var(--bg-primary)] hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border theme-border flex items-center justify-center text-xs text-[var(--text-secondary)] transition"
                      >
                        <FontAwesomeIcon icon={faMinus} />
                      </button>
                      <span className="text-xs font-semibold text-[var(--text-primary)] w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1, item.variantId)}
                        disabled={item.quantity >= item.stockQuantity}
                        className="w-6 h-6 rounded bg-[var(--bg-primary)] hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border theme-border disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-xs text-[var(--text-secondary)] transition"
                      >
                        <FontAwesomeIcon icon={faPlus} />
                      </button>
                    </div>
                  </div>
                  <button onClick={() => removeItem(item.id, item.variantId)} className="p-2 text-[var(--text-muted)] hover:text-red-500 transition">
                    <FontAwesomeIcon icon={faTrash} className="text-sm" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="p-6 border-t theme-border bg-[var(--bg-card)] space-y-4">
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-[var(--text-secondary)]">{t.subtotal}</span>
                <span className="text-xl font-bold text-[var(--text-primary)]">{formatPrice(getTotalAmount(), currency, language)}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)]">{t.taxNote}</p>
              <Link
                href="/checkout"
                className={`w-full py-3.5 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition ${
                  hasOutOfStockItems
                    ? 'bg-gray-400 cursor-not-allowed text-white pointer-events-none'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                }`}
                onClick={(e) => {
                  if (hasOutOfStockItems) { e.preventDefault(); return; }
                  toggleCartDrawer(false);
                }}
              >
                <span>{t.checkout}</span>
                <FontAwesomeIcon icon={faArrowRight} className={language === 'ar' ? 'rotate-180' : ''} />
              </Link>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
