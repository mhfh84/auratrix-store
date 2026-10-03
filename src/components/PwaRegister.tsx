'use client';

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleCheck, faWifi } from '@fortawesome/free-solid-svg-icons';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';

export default function PwaRegister() {
  const [isOffline, setIsOffline] = useState(false);
  const [showStatusToast, setShowStatusToast] = useState(false);
  const { language } = useSettings();
  const t = translations[language].pwa;

  useEffect(() => {
    // Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .catch(() => {});
      });
    }

    // Network Status Listeners
    const handleOnline = () => {
      setIsOffline(false);
      setShowStatusToast(true);
      const timer = setTimeout(() => setShowStatusToast(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowStatusToast(true);
    };

    if (typeof window !== 'undefined') {
      setIsOffline(!navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
    };
  }, []);

  if (!showStatusToast && !isOffline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-5 z-[9999] max-w-sm transition-all duration-300 transform translate-y-0"
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border ${
          isOffline
            ? 'bg-rose-950/90 text-rose-100 border-rose-800/80 shadow-rose-950/50'
            : 'bg-emerald-950/90 text-emerald-100 border-emerald-800/80 shadow-emerald-950/50'
        }`}
      >
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm ${
            isOffline ? 'bg-rose-900/80 text-rose-300' : 'bg-emerald-900/80 text-emerald-300'
          }`}
        >
          <FontAwesomeIcon icon={isOffline ? faWifi : faCircleCheck} className={isOffline ? 'opacity-70' : ''} />
        </div>

        <div className="flex-1 text-xs">
          <p className="font-bold">
            {isOffline ? t.offlineNotice : t.onlineRestored}
          </p>
          <p className="opacity-80 text-[11px]">
            {isOffline ? t.cachedDataNotice : t.syncSuccess}
          </p>
        </div>

        {isOffline && (
          <button
            onClick={() => setShowStatusToast(false)}
            className="text-xs opacity-60 hover:opacity-100 px-2 py-1"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
