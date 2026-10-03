'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import { faCommentDots, faXmark, faPaperPlane, faClock } from '@fortawesome/free-solid-svg-icons';

export default function FloatingWhatsApp() {
  const pathname = usePathname();
  const { language, serverSettings } = useSettings();
  const t = translations[language].whatsAppWidget;
  const isRTL = language === 'ar';

  const [isOpen, setIsOpen] = useState(false);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [customMsg, setCustomMsg] = useState('');

  // Business hours check (e.g., 9 AM to 11 PM)
  const currentHour = new Date().getHours();
  const isOnline = currentHour >= 9 && currentHour < 23;

  // Extract phone number from settings
  const rawWhatsApp = serverSettings?.socialWhatsApp || '';
  const rawPhone = serverSettings?.contactPhone || '';

  let cleanNumber = '';
  if (rawWhatsApp.includes('wa.me/')) {
    const match = rawWhatsApp.match(/wa\.me\/([0-9+]+)/);
    if (match) cleanNumber = match[1].replace(/[^0-9]/g, '');
  }
  if (!cleanNumber && rawPhone) {
    cleanNumber = rawPhone.replace(/[^0-9]/g, '');
  }
  if (!cleanNumber) {
    cleanNumber = '201000000000'; // Default fallback store WhatsApp
  }

  const storeName = serverSettings?.storeName || (language === 'ar' ? 'المتجر' : 'Store');

  // Context-aware default message based on the active page
  let contextualDefaultMsg = (t.prefilledMsgGeneral || 'Hello! I have an inquiry.').replace('{storeName}', storeName);

  if (pathname?.startsWith('/product/')) {
    contextualDefaultMsg = isRTL
      ? `مرحباً! أود الاستفسار عن هذا المنتج من متجر ${storeName}.`
      : `Hello! I would like to inquire about this product on ${storeName}.`;
  } else if (pathname?.startsWith('/order-tracking/') || pathname?.startsWith('/track-order')) {
    contextualDefaultMsg = isRTL
      ? `مرحباً! أود المساعدة في تتبع طلبي من متجر ${storeName}.`
      : `Hello! I need help tracking my order on ${storeName}.`;
  } else if (pathname?.startsWith('/checkout')) {
    contextualDefaultMsg = isRTL
      ? `مرحباً! أحتاج مساعدة في إتمام الطلب على متجر ${storeName}.`
      : `Hello! I need help completing my order on ${storeName}.`;
  }

  // Subtle prompt badge on first load
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasPrompted(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenWhatsApp = (customText?: string) => {
    const msgToSend = (customText && customText.trim()) ? customText.trim() : contextualDefaultMsg;
    const encoded = encodeURIComponent(msgToSend);
    const url = `https://wa.me/${cleanNumber}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed bottom-6 start-6 z-40 flex flex-col items-start select-none"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Mini Chat Popup Card */}
      {isOpen && (
        <div className="mb-3 w-80 sm:w-88 glass-card bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border theme-border overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white text-xl">
                  <FontAwesomeIcon icon={faWhatsapp} />
                </div>
                <span className={`absolute bottom-0 end-0 w-3 h-3 border-2 border-emerald-600 rounded-full ${
                  isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight">{storeName}</h4>
                <p className="text-[11px] text-emerald-100 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full inline-block ${isOnline ? 'bg-emerald-300' : 'bg-amber-300'}`} />
                  {isOnline ? t.online : (isRTL ? 'اترك رسالة' : 'Leave a message')}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white text-xs transition"
              aria-label="Close WhatsApp chat"
            >
              <FontAwesomeIcon icon={faXmark} />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3 bg-gray-50/50 dark:bg-gray-950/50">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-xl rounded-tl-none border theme-border shadow-sm">
              <p className="text-xs text-[var(--text-primary)] leading-relaxed font-medium">
                {language === 'ar'
                  ? `مرحباً بك في ${storeName}! 👋 كيف يمكننا مساعدتك اليوم؟ نحن متاحون للرد السريع عبر واتساب.`
                  : `Welcome to ${storeName}! 👋 How can we help you today? We are ready to assist you on WhatsApp.`}
              </p>
            </div>

            {/* Quick pre-filled prompt input */}
            <div className="space-y-2">
              <textarea
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                placeholder={contextualDefaultMsg}
                rows={2}
                className="w-full text-xs p-2.5 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
              />

              <button
                onClick={() => {
                  handleOpenWhatsApp(customMsg);
                  setIsOpen(false);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
              >
                <FontAwesomeIcon icon={faPaperPlane} className="text-xs" />
                <span>{t.startChat}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Trigger Button + Tooltip */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => {
            if (!isOpen) {
              setIsOpen(true);
              setHasPrompted(false);
            } else {
              setIsOpen(false);
            }
          }}
          title={t.tooltip}
          aria-label={t.tooltip}
          className="relative w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-400 text-white shadow-xl shadow-emerald-500/40 flex items-center justify-center text-2xl transition-all duration-300 hover:scale-110 active:scale-95 group focus:outline-none focus:ring-4 focus:ring-emerald-400/40 cursor-pointer"
        >
          {/* Pulsing ring */}
          <span className="absolute -inset-1 rounded-full bg-emerald-500 opacity-40 animate-ping pointer-events-none" />

          {/* Online indicator */}
          <span className={`absolute top-0 end-0 w-4 h-4 border-2 border-white dark:border-gray-900 rounded-full shadow-sm ${
            isOnline ? 'bg-emerald-400' : 'bg-amber-400'
          }`} />

          <FontAwesomeIcon
            icon={isOpen ? faXmark : faWhatsapp}
            className={`transition-transform duration-300 ${isOpen ? 'rotate-90 text-lg' : 'scale-105'}`}
          />
        </button>

        {/* Floating Tooltip / Prompt Badge (when closed) */}
        {!isOpen && (
          <div
            onClick={() => setIsOpen(true)}
            className={`cursor-pointer hidden sm:flex items-center gap-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-3.5 py-2 rounded-full border theme-border shadow-lg transition-all duration-300 hover:scale-105 ${
              hasPrompted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 pointer-events-none'
            }`}
          >
            <FontAwesomeIcon icon={faCommentDots} className="text-emerald-500 text-xs animate-bounce" />
            <span className="text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">
              {t.needHelp}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
