'use client';

import React, { useEffect, useState } from 'react';
import { useToastStore, Toast, ToastVariant } from '@/store/useToastStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faExclamationCircle,
  faExclamationTriangle,
  faInfoCircle,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';

const VARIANT_STYLES: Record<ToastVariant, { wrapper: string; icon: any; iconColor: string }> = {
  success: {
    wrapper:
      'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-200',
    icon: faCheckCircle,
    iconColor: 'text-emerald-500',
  },
  error: {
    wrapper:
      'bg-red-50 dark:bg-red-950/90 border-red-300 dark:border-red-700/60 text-red-800 dark:text-red-200',
    icon: faExclamationCircle,
    iconColor: 'text-red-500',
  },
  warning: {
    wrapper:
      'bg-amber-50 dark:bg-amber-950/90 border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-200',
    icon: faExclamationTriangle,
    iconColor: 'text-amber-500',
  },
  info: {
    wrapper:
      'bg-sky-50 dark:bg-sky-950/90 border-sky-300 dark:border-sky-700/60 text-sky-800 dark:text-sky-200',
    icon: faInfoCircle,
    iconColor: 'text-sky-500',
  },
};

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.remove);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(enterTimer);
  }, []);

  const styles = VARIANT_STYLES[toast.variant];

  return (
    <div
      className={`flex items-start gap-3 min-w-[280px] max-w-[360px] px-4 py-3.5 rounded-2xl border shadow-xl text-xs font-semibold transition-all duration-300 ${styles.wrapper} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      role="alert"
    >
      <FontAwesomeIcon icon={styles.icon} className={`text-base mt-0.5 flex-shrink-0 ${styles.iconColor}`} />
      <span className="flex-1 leading-relaxed">{toast.message}</span>
      <button
        type="button"
        onClick={() => remove(toast.id)}
        className="flex-shrink-0 opacity-60 hover:opacity-100 transition mt-0.5 cursor-pointer"
        aria-label="Dismiss"
      >
        <FontAwesomeIcon icon={faTimes} className="text-xs" />
      </button>
    </div>
  );
}

/**
 * Mount this once at the root level (StoreShell) to display global toast notifications.
 */
export default function ToastNotifications() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 end-6 z-[9999] flex flex-col gap-2.5 pointer-events-none"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
