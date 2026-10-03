'use client';

import React, { useEffect, useState } from 'react';
import { useCart, useCartStore } from '@/store/useCartStore';
import { useSettings } from '@/store/useSettingsStore';
import { formatPrice } from '@/lib/currencies';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShoppingBag, faArrowLeft, faArrowRight } from '@fortawesome/free-solid-svg-icons';

export default function CartBubble() {
  const { items, getTotalAmount, getTotalItems } = useCart();
  const { toggleCartDrawer } = useCartStore();
  const { language, currency } = useSettings();
  const t = translations[language].cart;
  const isRTL = language === 'ar';

  const totalItems = getTotalItems();
  const totalAmount = getTotalAmount();

  const [animateBadge, setAnimateBadge] = useState(false);

  // Bounce/pulse animation when items change
  useEffect(() => {
    if (totalItems > 0) {
      setAnimateBadge(true);
      const timer = setTimeout(() => setAnimateBadge(false), 500);
      return () => clearTimeout(timer);
    }
  }, [totalItems]);

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-6 start-1/2 -translate-x-1/2 sm:translate-x-0 sm:start-auto sm:end-6 z-40 transition-all duration-300 animate-fadeIn">
      <button
        type="button"
        onClick={() => toggleCartDrawer(true)}
        className="group relative flex items-center gap-3 px-5 py-3.5 rounded-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 text-white font-bold text-xs shadow-2xl shadow-indigo-600/40 border border-white/20 hover:scale-105 active:scale-95 transition-all duration-300 backdrop-blur-md cursor-pointer"
        title={t.title}
        aria-label={t.title}
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-full bg-indigo-500 blur-lg opacity-40 group-hover:opacity-60 transition duration-300 -z-10" />

        {/* Bag Icon & Badge */}
        <div className="relative flex items-center justify-center">
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-sm shadow-inner">
            <FontAwesomeIcon icon={faShoppingBag} className="text-white" />
          </div>
          <span
            className={`absolute -top-1.5 -end-1.5 min-w-[20px] h-5 px-1 bg-amber-400 text-gray-900 text-[10px] font-black rounded-full flex items-center justify-center shadow-md border-2 border-indigo-700 font-mono transition-transform duration-300 ${
              animateBadge ? 'scale-125' : 'scale-100'
            }`}
          >
            {totalItems}
          </span>
        </div>

        {/* Text & Price Info */}
        <div className="flex flex-col items-start text-start leading-tight pe-1">
          <span className="text-[10px] text-indigo-100 font-semibold uppercase tracking-wider">
            {t.title}
          </span>
          <span className="text-xs font-black font-mono tracking-tight text-white">
            {formatPrice(totalAmount, currency, language)}
          </span>
        </div>

        {/* Arrow Action */}
        <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center text-[10px] text-white/90 group-hover:bg-white group-hover:text-indigo-600 transition duration-300">
          <FontAwesomeIcon icon={isRTL ? faArrowLeft : faArrowRight} />
        </div>
      </button>
    </div>
  );
}
