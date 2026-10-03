'use client';

import React, { useState, useEffect } from 'react';
import { useCart } from '@/store/useCartStore';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingCart, faTimes, faArrowRight } from '@fortawesome/free-solid-svg-icons';

const SESSION_KEY = 'auratrix-cart-nudge-shown';

export default function AbandonedCartToast() {
  const { items, getTotalItems, getTotalAmount, toggleCartDrawer } = useCart();
  const { language, currency } = useSettings();
  const t = translations[language].abandonedCart;
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const totalItems = getTotalItems();
    if (totalItems === 0) return;

    // Only show once per browser session
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      return;
    }

    const timer = setTimeout(() => {
      setVisible(true);
      try {
        sessionStorage.setItem(SESSION_KEY, '1');
      } catch {
        // ignore
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [mounted, getTotalItems]);

  const handleViewCart = () => {
    setVisible(false);
    toggleCartDrawer(true);
  };

  const handleDismiss = () => {
    setVisible(false);
  };

  if (!mounted || !visible) return null;

  const totalItems = getTotalItems();
  const totalAmount = getTotalAmount();
  const isAr = language === 'ar';

  const itemsText = totalItems === 1
    ? t.singleItem
    : `${totalItems} ${t.multipleItems}`;

  return (
    <div
      className={`fixed z-[999] bottom-6 transition-all duration-500 ${
        isAr ? 'left-4 sm:left-6' : 'right-4 sm:right-6'
      } ${visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}
      role="alert"
      aria-live="polite"
    >
      <div className="relative w-[320px] sm:w-[360px] glass-card rounded-2xl border theme-border shadow-2xl shadow-black/20 dark:shadow-black/60 overflow-hidden">
        {/* Gradient accent line at top */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/30 relative flex-shrink-0">
                <FontAwesomeIcon icon={faShoppingCart} className="text-white text-sm" />
                <span className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center">
                  {totalItems > 9 ? '9+' : totalItems}
                </span>
              </div>
              <div>
                <p className="text-xs font-extrabold text-[var(--text-primary)]">
                  {t.toastTitle}
                </p>
                <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                  {itemsText}
                </p>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              id="cart-toast-dismiss-btn"
              aria-label="Dismiss cart reminder"
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition flex-shrink-0 mt-0.5"
            >
              <FontAwesomeIcon icon={faTimes} className="text-xs" />
            </button>
          </div>

          {/* Total */}
          <div className="flex items-center justify-between bg-[var(--bg-surface)] rounded-xl px-3 py-2 mb-3 border theme-border">
            <span className="text-[10px] text-[var(--text-secondary)] font-medium">
              {t.estimatedTotal}
            </span>
            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {formatPrice(totalAmount, currency, language)}
            </span>
          </div>

          {/* CTA Button */}
          <button
            id="cart-toast-view-cart-btn"
            onClick={handleViewCart}
            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/25 transition flex items-center justify-center gap-2 group"
          >
            <span>{t.viewCartAndCheckout}</span>
            <FontAwesomeIcon
              icon={faArrowRight}
              className={`text-xs group-hover:translate-x-0.5 transition-transform ${isAr ? 'rotate-180' : ''}`}
            />
          </button>

          {/* Skip link */}
          <button
            onClick={handleDismiss}
            className="w-full mt-1.5 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition text-center py-1"
          >
            {t.continueShopping}
          </button>
        </div>
      </div>
    </div>
  );
}
