'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl } from '@/lib/images';
import { getProductUrl } from '@/lib/productUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTruckFast,
  faSearch,
  faCheckCircle,
  faClock,
  faBoxOpen,
  faHouseCircleCheck,
  faReceipt,
  faExclamationCircle,
  faExternalLinkAlt,
  faCalendarAlt,
  faTruck,
  faArrowUpRightFromSquare,
} from '@fortawesome/free-solid-svg-icons';
import InvoiceModal from '@/components/InvoiceModal';

function TrackOrderContent() {
  const searchParams = useSearchParams();
  const { language, currency, serverSettings } = useSettings();
  const t = translations[language].tracking;
  const isRTL = language === 'ar';

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const fetchTrackOrder = useCallback(async (searchVal: string) => {
    if (!searchVal.trim()) return;

    setLoading(true);
    setError('');
    setOrder(null);

    try {
      const res = await fetch(`/api/track-order?query=${encodeURIComponent(searchVal.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t.orderNotFound);
      }
      setOrder(data.order);
    } catch (err: any) {
      setError(err.message || t.orderNotFound);
    } finally {
      setLoading(false);
    }
  }, [t.orderNotFound]);

  // Auto-track if query param exists in URL
  useEffect(() => {
    const q = searchParams.get('query') || searchParams.get('trackingNumber') || searchParams.get('orderId');
    if (q) {
      setQuery(q);
      fetchTrackOrder(q);
    }
  }, [searchParams, fetchTrackOrder]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchTrackOrder(query);
  };

  const getStepStatus = (stepIndex: number, currentStatus: string) => {
    const statusOrder = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex >= stepIndex) return 'completed';
    if (currentIndex === stepIndex - 1) return 'current';
    return 'upcoming';
  };

  const steps = [
    { label: t.stepPending, icon: faClock, desc: t.stepPendingDesc },
    { label: t.stepProcessing, icon: faBoxOpen, desc: t.stepProcessingDesc },
    { label: t.stepShipped, icon: faTruckFast, desc: t.stepShippedDesc },
    { label: t.stepDelivered, icon: faHouseCircleCheck, desc: t.stepDeliveredDesc },
  ];

  const courierUrl =
    serverSettings?.courierTrackingEnabled && order?.trackingNumber
      ? (
          serverSettings.courierTrackingUrlTemplate ||
          'https://www.aramex.com/track/results?mode=0&ShipmentNumber={trackingNumber}'
        ).replace('{trackingNumber}', encodeURIComponent(order.trackingNumber.trim()))
      : null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 text-2xl mb-1 shadow-sm border border-indigo-200 dark:border-indigo-800/40">
          <FontAwesomeIcon icon={faTruckFast} />
        </div>
        <h1 className="text-3xl font-black text-[var(--text-primary)]">{t.title}</h1>
        <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      {/* Search Input Box */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border theme-border shadow-md">
        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.inputPlaceholder}
              className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-2xl ps-11 pe-4 py-3.5 border theme-border focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
            />
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/25 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <FontAwesomeIcon icon={faTruckFast} />
            <span>{loading ? t.searching : t.trackBtn}</span>
          </button>
        </form>

        {error && (
          <div className="mt-4 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-base" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Order Tracking Result & Timeline */}
      {order && (
        <div className="glass-panel rounded-3xl border theme-border shadow-xl p-6 sm:p-8 space-y-8 animate-fadeIn">
          {/* Order Meta Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b theme-border">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-1 rounded-md">
                {t.orderFound}
              </span>
              <h2 className="text-xl font-black text-[var(--text-primary)] font-mono">
                #{order.id.slice(0, 10).toUpperCase()}
              </h2>
              {order.trackingNumber && (
                <p className="text-xs font-mono font-bold text-[var(--text-secondary)]">
                  {t.trackingNumber}{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400 font-black">{order.trackingNumber}</strong>
                </p>
              )}
              {order.estimatedDelivery && (
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/50 mt-1">
                  <FontAwesomeIcon icon={faCalendarAlt} />
                  <span>
                    {t.estimatedDeliveryLabel}{' '}
                    {new Date(order.estimatedDelivery).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {courierUrl && (
                <a
                  href={courierUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:from-indigo-500 hover:to-sky-500 text-white text-xs font-extrabold shadow-md shadow-indigo-600/25 transition cursor-pointer"
                >
                  <FontAwesomeIcon icon={faTruck} />
                  <span>{t.courierTrackBtn}</span>
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="text-[10px]" />
                </a>
              )}

              <button
                onClick={() => setIsInvoiceOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg-surface)] border theme-border text-xs font-bold text-[var(--text-primary)] hover:border-indigo-400 transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faReceipt} className="text-indigo-500" />
                <span>{t.viewInvoiceBtn}</span>
              </button>

              <div className="text-end">
                <span className="text-xs text-[var(--text-muted)] block">{t.totalLabel}</span>
                <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                  {formatPrice(order.totalAmount, currency, language)}
                </span>
              </div>
            </div>
          </div>

          {/* 4-Step Progress Tracker */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
              {t.timelineTitle}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 relative">
              {steps.map((step, index) => {
                const status = getStepStatus(index, order.status);
                const isCompleted = status === 'completed';
                const isCurrent = status === 'current';

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-2xl border transition text-start space-y-2 ${
                      isCompleted
                        ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700/60'
                        : isCurrent
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-400/30'
                        : 'bg-[var(--bg-surface)] border theme-border opacity-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                          isCompleted
                            ? 'bg-emerald-500 text-white'
                            : isCurrent
                            ? 'bg-indigo-600 text-white animate-pulse'
                            : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
                        }`}
                      >
                        <FontAwesomeIcon icon={isCompleted ? faCheckCircle : step.icon} />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-[var(--text-muted)]">0{index + 1}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[var(--text-primary)]">{step.label}</p>
                      <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-snug">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ordered Items List - Clickable Products */}
          <div className="pt-4 border-t theme-border space-y-3">
            <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
              {t.contentsTitle}
            </h4>
            <div className="divide-y theme-border">
              {order.orderItems.map((item: any) => {
                const itemImage = getImageUrl(item.product?.images);
                const productUrl = getProductUrl(item.product);

                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                    <Link
                      href={productUrl}
                      className="flex items-center gap-3 group hover:opacity-90 transition flex-1 min-w-0"
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 border theme-border flex-shrink-0 group-hover:ring-2 group-hover:ring-indigo-500 transition">
                        <Image
                          src={itemImage}
                          alt={item.product?.title || 'Product'}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-[var(--text-primary)] group-hover:text-indigo-600 transition-colors truncate flex items-center gap-1.5">
                          <span>{item.product?.title}</span>
                          <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[9px] opacity-0 group-hover:opacity-70 transition" />
                        </p>
                        {item.colorName && (
                          <span className="text-[10px] text-[var(--text-muted)] block">
                            {t.colorLabel + ' '}{item.colorName}
                          </span>
                        )}
                      </div>
                    </Link>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <span className="text-[var(--text-secondary)] font-mono text-xs">
                        {t.qtyLabel + ' '}{item.quantity}
                      </span>
                      <span className="font-extrabold text-[var(--text-primary)] font-mono text-xs">
                        {formatPrice(item.price * item.quantity, currency, language)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {order && (
        <InvoiceModal isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} order={order} />
      )}
    </div>
  );
}

export default function TrackOrderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <TrackOrderContent />
    </Suspense>
  );
}

