'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '@/store/useSettingsStore';
import { translations, getLocalizedText } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faGift, faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';

function getBrowserFingerprintId(): string {
  try {
    const key = 'auratrix_fp_id';
    let fp = localStorage.getItem(key);
    if (!fp) {
      fp = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, fp);
    }
    return fp;
  } catch {
    return '';
  }
}

export default function PromoPopup() {
  const { language, serverSettings } = useSettings();
  const t = translations[language].popup;

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [alreadyUsed, setAlreadyUsed] = useState<boolean | null>(null);

  const isEnabled = serverSettings?.popupEnabled ?? true;
  const promoCode = serverSettings?.popupDiscountCode || 'WELCOME10';
  
  const popupTitle = serverSettings?.popupTitle 
    ? getLocalizedText(serverSettings.popupTitle, language)
    : t.title;

  const popupText = serverSettings?.popupText
    ? getLocalizedText(serverSettings.popupText, language)
    : t.subtitle;

  const checkIfUsed = useCallback(async () => {
    if (!isEnabled || !promoCode) {
      setAlreadyUsed(true);
      return;
    }
    try {
      const locallyCopied = localStorage.getItem(`auratrix_promo_copied_${promoCode}`);
      if (locallyCopied === 'true') {
        setAlreadyUsed(true);
        return;
      }

      const fingerprintId = getBrowserFingerprintId();
      const res = await fetch(
        `/api/promocodes/check-used?code=${encodeURIComponent(promoCode)}&fingerprintId=${encodeURIComponent(fingerprintId)}`
      );
      if (res.ok) {
        const data = await res.json();
        setAlreadyUsed(data.used === true);
      } else {
        setAlreadyUsed(false);
      }
    } catch {
      setAlreadyUsed(false);
    }
  }, [isEnabled, promoCode]);

  useEffect(() => {
    checkIfUsed();
  }, [checkIfUsed]);

  useEffect(() => {
    if (!isEnabled || alreadyUsed === null || alreadyUsed === true) return;

    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 4000);

    return () => clearTimeout(timer);
  }, [isEnabled, alreadyUsed]);

  const handleDismiss = () => {
    setIsOpen(false);
    try {
      sessionStorage.setItem(`auratrix_promo_dismissed_${promoCode}`, 'true');
    } catch {}
  };

  const handleCopy = async () => {
    navigator.clipboard.writeText(promoCode).catch(() => {});
    setCopied(true);

    try {
      localStorage.setItem(`auratrix_promo_copied_${promoCode}`, 'true');
    } catch {}

    setTimeout(() => {
      setCopied(false);
      setIsOpen(false);
      setAlreadyUsed(true);
    }, 1500);
  };

  if (!isOpen || !isEnabled || alreadyUsed !== false) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="relative bg-[var(--bg-surface)] text-[var(--text-primary)] border theme-border rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl overflow-hidden text-center">
        {/* Glow accent decoration */}
        <div className="absolute -top-16 -end-16 w-36 h-36 bg-gradient-to-tr from-pink-500/20 to-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -start-16 w-36 h-36 bg-gradient-to-tr from-indigo-500/20 to-sky-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 end-4 p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-full hover:bg-[var(--bg-card)] transition"
          aria-label="Close popup"
        >
          <FontAwesomeIcon icon={faTimes} className="text-base" />
        </button>

        {/* Gift Icon */}
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-pink-500 text-white flex items-center justify-center text-2xl shadow-lg shadow-indigo-500/30 mb-4">
          <FontAwesomeIcon icon={faGift} />
        </div>

        <h3 className="text-lg font-black text-[var(--text-primary)]">{popupTitle}</h3>
        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed">
          {popupText}
        </p>

        {/* Promo Code Box */}
        <div className="mt-5 p-3.5 rounded-2xl bg-[var(--bg-card)] border-2 border-dashed border-indigo-300 dark:border-indigo-700/60 flex items-center justify-between gap-2">
          <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 text-base tracking-widest ps-2">
            {promoCode}
          </span>
          <button
            onClick={handleCopy}
            className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm ${
              copied
                ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
            }`}
          >
            <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
            <span>{copied ? t.copied : t.copyBtn}</span>
          </button>
        </div>

        <button
          onClick={handleDismiss}
          className="mt-4 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition underline decoration-dotted"
        >
          {t.noThanks}
        </button>
      </div>
    </div>
  );
}
