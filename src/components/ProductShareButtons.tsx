'use client';

import React, { useState } from 'react';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faWhatsapp,
  faTelegram,
  faFacebookF,
  faXTwitter,
} from '@fortawesome/free-brands-svg-icons';
import { faLink, faCheck, faShareNodes } from '@fortawesome/free-solid-svg-icons';

interface ProductShareButtonsProps {
  title: string;
  url?: string;
}

export default function ProductShareButtons({ title, url }: ProductShareButtonsProps) {
  const { language } = useSettings();
  const t = translations[language].productShare;
  const isRTL = language === 'ar';

  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);

  // Fallback to window.location.href on client
  const targetUrl = typeof window !== 'undefined' ? (url || window.location.href) : (url || '');
  const encodedUrl = encodeURIComponent(targetUrl);
  const encodedTitle = encodeURIComponent(title);

  const handleCopyLink = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(targetUrl);
        setCopied(true);
        setShowToast(true);
        setTimeout(() => setCopied(false), 2500);
        setTimeout(() => setShowToast(false), 3000);
      }
    } catch (e) {
      console.error('Failed to copy product URL', e);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          url: targetUrl,
        });
      } catch (err) {
        // Cancelled by user or unsupported
      }
    }
  };

  const shareLinks = [
    {
      name: t.whatsapp,
      icon: faWhatsapp,
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      bgColor: 'hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-400 hover:border-emerald-300',
    },
    {
      name: t.telegram,
      icon: faTelegram,
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      bgColor: 'hover:bg-sky-50 hover:text-sky-500 dark:hover:bg-sky-950/60 dark:hover:text-sky-400 hover:border-sky-300',
    },
    {
      name: t.facebook,
      icon: faFacebookF,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      bgColor: 'hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/60 dark:hover:text-blue-400 hover:border-blue-300',
    },
    {
      name: t.twitter,
      icon: faXTwitter,
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      bgColor: 'hover:bg-gray-100 hover:text-black dark:hover:bg-gray-800 dark:hover:text-white hover:border-gray-400',
    },
  ];

  return (
    <div className="space-y-3 pt-4 border-t theme-border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faShareNodes} className="text-indigo-600 dark:text-indigo-400 text-xs" />
          <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
            {t.shareProduct}
          </span>
        </div>

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 shadow-sm ${
            copied
              ? 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-400 text-emerald-600 dark:text-emerald-300 scale-105'
              : 'bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-indigo-500 hover:text-indigo-600 active:scale-95'
          }`}
          title={t.copyLink}
        >
          <FontAwesomeIcon icon={copied ? faCheck : faLink} className={copied ? 'text-emerald-500' : 'text-indigo-500'} />
          <span>{copied ? t.copied : t.copyLink}</span>
        </button>
      </div>

      {/* Social Icons Row */}
      <div className="flex items-center gap-2 flex-wrap">
        {shareLinks.map((item, idx) => (
          <a
            key={idx}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            title={`Share on ${item.name}`}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border theme-border bg-[var(--bg-surface)] text-xs font-bold text-[var(--text-secondary)] transition-all duration-200 shadow-sm hover:scale-105 ${item.bgColor}`}
          >
            <FontAwesomeIcon icon={item.icon} className="text-sm" />
            <span className="hidden sm:inline">{item.name}</span>
          </a>
        ))}
      </div>

      {/* Floating Toast Notification on Copy Link */}
      {showToast && (
        <div
          className="fixed bottom-24 start-1/2 -translate-x-1/2 z-50 bg-gray-900/95 text-white dark:bg-white/95 dark:text-gray-950 backdrop-blur-xl px-5 py-3 rounded-2xl shadow-2xl border border-white/20 flex items-center gap-3 animate-in fade-in zoom-in-95 duration-200"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs shadow-md">
            <FontAwesomeIcon icon={faCheck} />
          </div>
          <span className="text-xs sm:text-sm font-bold tracking-tight">
            {t.shareToast}
          </span>
        </div>
      )}
    </div>
  );
}
