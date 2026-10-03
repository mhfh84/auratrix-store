'use client';

import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDownload,
  faXmark,
  faMobileScreenButton,
  faArrowUpFromBracket,
  faPlusSquare,
} from '@fortawesome/free-solid-svg-icons';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const { language, serverSettings } = useSettings();
  const t = translations[language].pwa;
  const storeTitle = serverSettings?.storeName || (language === 'ar' ? 'المتجر' : 'Store');
  const storeLogo = serverSettings?.storeLogo || '/icons/icon-192x192.png';

  useEffect(() => {
    // Check if already running in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return;
    }

    // Check if recently dismissed
    const dismissedAt = localStorage.getItem('auratrix_pwa_dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt, 10)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for BeforeInstallPrompt on Android / Desktop
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Wait 3 seconds before showing to not disrupt initial page impression
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If iOS and not standalone, show after a delay
    if (isIosDevice) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    localStorage.setItem('auratrix_pwa_dismissed', Date.now().toString());
  };

  if (!showPrompt) return null;

  const appHeading = language === 'ar' ? `تطبيق ${storeTitle}` : `${storeTitle} App`;

  return (
    <aside
      aria-label={`${t.installApp} - ${storeTitle}`}
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="relative bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl border border-indigo-500/30 rounded-3xl p-5 shadow-2xl shadow-indigo-950/60 text-white">
        <button
          onClick={handleDismiss}
          className="absolute top-4 left-4 sm:left-4 text-slate-400 hover:text-white transition-colors p-1"
          aria-label="Close"
        >
          <FontAwesomeIcon icon={faXmark} className="text-sm" />
        </button>

        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 p-0.5 shadow-lg shadow-indigo-500/30 flex-shrink-0 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={storeLogo}
              alt={storeTitle}
              className="w-full h-full object-contain rounded-[14px]"
            />
          </div>

          <div className="flex-1 pr-1">
            <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
              <span className="truncate max-w-[200px]">{appHeading}</span>
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-400/20 flex-shrink-0">
                PWA
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              {t.installDesc}
            </p>
          </div>
        </div>

        {/* iOS Guide popup inline */}
        {showIOSGuide && (
          <div className="mt-4 p-3.5 bg-slate-800/90 rounded-2xl border border-slate-700/80 text-xs space-y-2 text-slate-200">
            <p className="font-semibold text-indigo-300">
              {t.iosInstructionsTitle}
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed text-slate-300">
              <li>
                {t.iosStep1}{' '}
                <FontAwesomeIcon icon={faArrowUpFromBracket} className="text-indigo-400 mx-1" />
              </li>
              <li>
                {t.iosStep2}{' '}
                <FontAwesomeIcon icon={faPlusSquare} className="text-indigo-400 mx-1" />
              </li>
              <li>
                {t.iosStep3}
              </li>
            </ol>
          </div>
        )}

        <div className="mt-4 flex items-center gap-2.5">
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2.5 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium text-xs rounded-xl shadow-md shadow-indigo-600/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <FontAwesomeIcon icon={isIOS ? faMobileScreenButton : faDownload} />
            <span>
              {isIOS ? t.instructionsButton : t.installButton}
            </span>
          </button>
          <button
            onClick={handleDismiss}
            className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-colors"
          >
            {translations[language].nav?.langToggle ? (language === 'ar' ? 'لاحقاً' : 'Later') : 'Later'}
          </button>
        </div>
      </div>
    </aside>
  );
}
