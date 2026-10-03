'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl } from '@/lib/images';
import { getProductUrl } from '@/lib/productUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTruckFast,
  faCheckCircle,
  faClock,
  faBoxOpen,
  faHouseCircleCheck,
  faReceipt,
  faArrowLeft,
  faCalendarAlt,
  faMapPin,
  faPhone,
  faUser,
  faBan,
  faSpinner,
  faArrowUpRightFromSquare,
} from '@fortawesome/free-solid-svg-icons';
import InvoiceModal from '@/components/InvoiceModal';

export default function OrderTrackingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { language, currency, serverSettings } = useSettings();
  const t = translations[language].tracking;
  const isRTL = language === 'ar';

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);

  const fetchOrderDetails = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/track-order?query=${encodeURIComponent(orderId)}`);
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
  }, [orderId, t.orderNotFound]);

  useEffect(() => {
    fetchOrderDetails();
  }, [fetchOrderDetails]);

  const steps = [
    { label: t.stepPending, icon: faClock, desc: t.stepPendingDesc, key: 'PENDING' },
    { label: t.stepProcessing, icon: faBoxOpen, desc: t.stepProcessingDesc, key: 'PROCESSING' },
    { label: t.stepShipped, icon: faTruckFast, desc: t.stepShippedDesc, key: 'SHIPPED' },
    { label: t.stepDelivered, icon: faHouseCircleCheck, desc: t.stepDeliveredDesc, key: 'DELIVERED' },
  ];

  const getStepStatus = (stepIndex: number, currentStatus: string) => {
    if (currentStatus === 'CANCELLED') return 'cancelled';
    const statusOrder = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex >= stepIndex) return 'completed';
    if (currentIndex === stepIndex - 1) return 'current';
    return 'upcoming';
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b theme-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition border theme-border"
            title="Back"
          >
            <FontAwesomeIcon icon={faArrowLeft} className={isRTL ? 'rotate-180' : ''} />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)] flex items-center gap-2.5">
              <FontAwesomeIcon icon={faTruckFast} className="text-indigo-600" />
              <span>{t.title}</span>
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isRTL ? `رقم الطلب: #${orderId?.slice(0, 10).toUpperCase()}` : `Order ID: #${orderId?.slice(0, 10).toUpperCase()}`}
            </p>
          </div>
        </div>

        {order && (
          <button
            onClick={() => setIsInvoiceOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition self-start sm:self-auto"
          >
            <FontAwesomeIcon icon={faReceipt} />
            <span>{translations[language].account.viewInvoice}</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="glass-panel p-12 text-center rounded-3xl border theme-border space-y-4 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 mx-auto">
            <FontAwesomeIcon icon={faSpinner} spin className="text-xl" />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            {isRTL ? 'جاري تحميل تفاصيل تتبع الطلب...' : 'Loading order tracking details...'}
          </p>
        </div>
      ) : error || !order ? (
        <div className="glass-panel p-12 text-center rounded-3xl border border-rose-300 dark:border-rose-800 bg-rose-50/50 dark:bg-rose-950/30 space-y-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-600 flex items-center justify-center text-2xl mx-auto">
            <FontAwesomeIcon icon={faBan} />
          </div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{error || t.orderNotFound}</h2>
          <p className="text-xs text-[var(--text-secondary)] max-w-md mx-auto">
            {isRTL
              ? 'تأكد من صحة رقم الطلب أو تواصل مع خدمة العملاء للمساعدة.'
              : 'Please check that the order ID is correct or contact customer support for assistance.'}
          </p>
          <div className="pt-2">
            <Link
              href="/track-order"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
            >
              <span>{isRTL ? 'البحث عن طلب آخر' : 'Search another order'}</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Order Header Summary Card */}
          <div className="glass-panel p-6 rounded-3xl border theme-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-black text-lg text-[var(--text-primary)]">
                  #{order.id.slice(0, 10).toUpperCase()}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black ${
                  order.status === 'DELIVERED'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800'
                    : order.status === 'CANCELLED'
                    ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-800'
                }`}>
                  {order.status}
                </span>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-1.5">
                <FontAwesomeIcon icon={faCalendarAlt} className="text-[11px]" />
                <span>
                  {new Date(order.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </p>
            </div>

            <div className="text-start sm:text-end">
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono block">
                {formatPrice(order.totalAmount, currency, language)}
              </span>
              <span className="text-xs text-[var(--text-secondary)]">
                {order.orderItems?.length || 0} {translations[language].cart.items}
              </span>
            </div>
          </div>

          {/* Timeline Steps Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border theme-border shadow-sm space-y-6">
            <h2 className="text-base font-extrabold text-[var(--text-primary)]">
              {isRTL ? 'مراحل الشحن والتوصيل' : 'Delivery Stages'}
            </h2>

            {order.status === 'CANCELLED' ? (
              <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <FontAwesomeIcon icon={faBan} />
                <span>{isRTL ? 'تم إلغاء هذا الطلب.' : 'This order was cancelled.'}</span>
              </div>
            ) : (
              <div className="relative">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                  {steps.map((step, idx) => {
                    const statusState = getStepStatus(idx, order.status);
                    const isDone = statusState === 'completed';
                    const isCurrent = statusState === 'current';

                    return (
                      <div key={step.key} className="flex sm:flex-col items-center sm:text-center gap-4 sm:gap-2 relative">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold transition-all shadow-md flex-shrink-0 ${
                            isDone
                              ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                              : isCurrent
                              ? 'bg-indigo-600 text-white shadow-indigo-600/30 ring-4 ring-indigo-500/20 animate-pulse'
                              : 'bg-[var(--bg-card)] border theme-border text-[var(--text-muted)]'
                          }`}
                        >
                          <FontAwesomeIcon icon={isDone ? faCheckCircle : step.icon} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-extrabold ${
                            isDone ? 'text-emerald-600 dark:text-emerald-400' : isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)]'
                          }`}>
                            {step.label}
                          </p>
                          <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Courier Tracking Link Banner if available */}
            {courierUrl && (
              <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-between gap-3 text-xs flex-wrap">
                <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
                  <FontAwesomeIcon icon={faTruckFast} className="text-indigo-600" />
                  <span>
                    {isRTL ? `رقم بوليصة الشحن: ${order.trackingNumber}` : `Tracking Number: ${order.trackingNumber}`}
                  </span>
                </div>
                <a
                  href={courierUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition inline-flex items-center gap-1.5 text-xs"
                >
                  <span>{isRTL ? 'تتبع عبر شركة الشحن' : 'Track on Courier'}</span>
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[10px]" />
                </a>
              </div>
            )}
          </div>

          {/* Delivery & Items Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Delivery Info */}
            <div className="glass-panel p-6 rounded-3xl border theme-border space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FontAwesomeIcon icon={faMapPin} className="text-indigo-600" />
                <span>{isRTL ? 'بيانات الشحن والاستلام' : 'Shipping & Recipient Details'}</span>
              </h3>
              <div className="space-y-2 text-xs text-[var(--text-secondary)]">
                {order.customerName && (
                  <p className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faUser} className="text-[var(--text-muted)] w-3.5" />
                    <span className="font-semibold text-[var(--text-primary)]">{order.customerName}</span>
                  </p>
                )}
                {order.customerPhone && (
                  <p className="flex items-center gap-2">
                    <FontAwesomeIcon icon={faPhone} className="text-[var(--text-muted)] w-3.5" />
                    <span className="font-mono">{order.customerPhone}</span>
                  </p>
                )}
                {order.shippingAddress && (
                  <p className="flex items-start gap-2">
                    <FontAwesomeIcon icon={faMapPin} className="text-[var(--text-muted)] w-3.5 mt-0.5" />
                    <span>
                      {order.city ? `${order.city}, ` : ''}{order.state ? `${order.state} — ` : ''}{order.shippingAddress}
                    </span>
                  </p>
                )}
              </div>
            </div>

            {/* Items Summary */}
            <div className="glass-panel p-6 rounded-3xl border theme-border space-y-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <FontAwesomeIcon icon={faBoxOpen} className="text-indigo-600" />
                <span>{translations[language].cart.title} ({order.orderItems?.length || 0})</span>
              </h3>
              <div className="space-y-2.5 max-h-52 overflow-y-auto divide-y theme-border text-xs">
                {order.orderItems?.map((item: any) => (
                  <div key={item.id} className="pt-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                        <Image
                          src={getImageUrl(item.product?.images)}
                          alt={item.product?.title || 'Product'}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-[var(--text-primary)] truncate">{item.product?.title}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">x {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-[var(--text-primary)]">
                      {formatPrice(item.price * item.quantity, currency, language)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice modal */}
      {isInvoiceOpen && order && (
        <InvoiceModal
          isOpen={isInvoiceOpen}
          onClose={() => setIsInvoiceOpen(false)}
          order={order}
        />
      )}
    </div>
  );
}
