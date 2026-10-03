'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPrint,
  faArrowLeft,
  faReceipt,
  faCheckCircle,
  faSpinner,
  faBan,
  faFileInvoice,
} from '@fortawesome/free-solid-svg-icons';

export default function FullInvoicePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.orderId as string;
  const { language, currency, serverSettings } = useSettings();
  const t = translations[language].invoice;
  const isRTL = language === 'ar';

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/track-order?query=${encodeURIComponent(orderId)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invoice not found');
      }
      setOrder(data.order);
    } catch (err: any) {
      setError(err.message || 'Invoice not found');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-indigo-600" />
          <p className="text-xs text-[var(--text-secondary)]">{isRTL ? 'جاري تحميل الفاتورة...' : 'Loading invoice...'}</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 text-center glass-panel rounded-3xl border border-rose-300 dark:border-rose-800 space-y-4">
        <FontAwesomeIcon icon={faBan} className="text-3xl text-rose-500" />
        <h2 className="text-lg font-bold text-[var(--text-primary)]">{error || 'Invoice not found'}</h2>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
        >
          <FontAwesomeIcon icon={faArrowLeft} className={isRTL ? 'rotate-180' : ''} />
          <span>{translations[language].account.tabOrders}</span>
        </Link>
      </div>
    );
  }

  let guest: any = null;
  if (order.guestInfo) {
    try {
      guest = typeof order.guestInfo === 'string' ? JSON.parse(order.guestInfo) : order.guestInfo;
    } catch {
      guest = null;
    }
  }

  const customerName = order.user?.name || guest?.name || order.customerName || (isRTL ? 'عميل' : 'Customer');
  const customerEmail = order.user?.email || guest?.email || order.customerEmail || '';
  const customerPhone = guest?.phone || order.customerPhone || '';
  const customerAddress = guest?.address || order.shippingAddress || '';
  const customerState = guest?.state || order.state || '';
  const customerCity = guest?.city || order.city || '';

  const itemsSubtotal = (order.orderItems || []).reduce(
    (sum: number, item: any) => sum + item.price * item.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] py-8 px-4 sm:px-6">
      {/* Top action bar — hidden during print */}
      <div className="max-w-3xl mx-auto mb-6 flex items-center justify-between gap-4 print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border theme-border hover:bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-bold transition"
        >
          <FontAwesomeIcon icon={faArrowLeft} className={isRTL ? 'rotate-180' : ''} />
          <span>{isRTL ? 'رجوع' : 'Back'}</span>
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
        >
          <FontAwesomeIcon icon={faPrint} />
          <span>{t.print}</span>
        </button>
      </div>

      {/* Invoice Document Paper */}
      <div className="max-w-3xl mx-auto bg-[var(--bg-surface)] border theme-border rounded-3xl p-6 sm:p-10 shadow-xl print:shadow-none print:border-none print:p-0">
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b theme-border">
          <div>
            <div className="flex items-center gap-3">
              {serverSettings?.storeLogo ? (
                <div className="relative w-12 h-12 rounded-xl overflow-hidden">
                  <Image src={serverSettings.storeLogo} alt="Store Logo" fill className="object-contain" />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center text-xl shadow-md">
                  <FontAwesomeIcon icon={faFileInvoice} />
                </div>
              )}
              <div>
                <h1 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
                  {serverSettings?.storeName || 'Auratrix Store'}
                </h1>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {t.invoiceNo}: <span className="font-mono font-bold text-indigo-600">#{order.id.slice(0, 10).toUpperCase()}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="text-start sm:text-end text-xs space-y-1">
            <p className="font-bold text-[var(--text-primary)]">{t.date}: {new Date(order.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</p>
            <p className="text-[var(--text-secondary)]">
              {isRTL ? 'طريقة الدفع:' : 'Payment Method:'} <span className="font-semibold">{order.paymentMethod || 'COD'}</span>
            </p>
            <p className="text-[var(--text-secondary)]">
              {isRTL ? 'حالة الدفع:' : 'Payment Status:'} <span className="font-semibold text-emerald-600">{order.paymentStatus || 'PENDING'}</span>
            </p>
          </div>
        </div>

        {/* Customer & Shipping Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b theme-border text-xs">
          <div>
            <h3 className="font-bold text-[var(--text-primary)] mb-2">{t.billTo}:</h3>
            <p className="font-semibold text-[var(--text-primary)]">{customerName}</p>
            {customerEmail && <p className="text-[var(--text-secondary)]">{customerEmail}</p>}
            {customerPhone && <p className="text-[var(--text-secondary)] font-mono">{customerPhone}</p>}
          </div>

          <div>
            <h3 className="font-bold text-[var(--text-primary)] mb-2">{t.address}:</h3>
            <p className="text-[var(--text-secondary)]">
              {customerState ? `${customerState} — ` : ''}{customerCity ? `${customerCity}, ` : ''}{customerAddress}
            </p>
            {order.trackingNumber && (
              <p className="text-indigo-600 font-mono font-bold mt-1">
                Tracking: {order.trackingNumber}
              </p>
            )}
          </div>
        </div>

        {/* Itemized Table */}
        <div className="py-6 border-b theme-border overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b theme-border text-[var(--text-muted)] font-bold">
                <th className="pb-3 text-start">#</th>
                <th className="pb-3 text-start">{t.item}</th>
                <th className="pb-3 text-center">{t.qty}</th>
                <th className="pb-3 text-end">{t.unitPrice}</th>
                <th className="pb-3 text-end">{t.lineTotal}</th>
              </tr>
            </thead>
            <tbody className="divide-y theme-border">
              {(order.orderItems || []).map((item: any, idx: number) => (
                <tr key={item.id} className="py-2.5">
                  <td className="py-3 text-[var(--text-muted)] font-mono">{idx + 1}</td>
                  <td className="py-3 font-semibold text-[var(--text-primary)]">
                    <div>{item.product?.title || 'Product'}</div>
                    {item.colorName && (
                      <span className="text-[10px] text-[var(--text-muted)]">{item.colorName}</span>
                    )}
                  </td>
                  <td className="py-3 text-center font-mono font-bold text-[var(--text-primary)]">{item.quantity}</td>
                  <td className="py-3 text-end font-mono text-[var(--text-secondary)]">{formatPrice(item.price, currency, language)}</td>
                  <td className="py-3 text-end font-mono font-bold text-[var(--text-primary)]">
                    {formatPrice(item.price * item.quantity, currency, language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="pt-6 flex justify-end">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-[var(--text-secondary)]">
              <span>{t.subtotal}</span>
              <span className="font-mono font-bold">{formatPrice(itemsSubtotal, currency, language)}</span>
            </div>

            {Boolean(order.shippingFee && order.shippingFee > 0) && (
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>{t.shipping}</span>
                <span className="font-mono font-bold">{formatPrice(order.shippingFee, currency, language)}</span>
              </div>
            )}

            {Boolean(order.discountAmount && order.discountAmount > 0) && (
              <div className="flex justify-between text-emerald-600 font-bold">
                <span>{t.discount}</span>
                <span className="font-mono">-{formatPrice(order.discountAmount, currency, language)}</span>
              </div>
            )}

            <div className="flex justify-between text-base font-black text-[var(--text-primary)] pt-3 border-t theme-border">
              <span>{t.total}</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400">
                {formatPrice(order.totalAmount, currency, language)}
              </span>
            </div>

            {Boolean(order.depositAmount && order.depositAmount > 0) && (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-[11px] space-y-1 mt-3">
                <div className="flex justify-between text-amber-800 dark:text-amber-300 font-bold">
                  <span>العربون المسجل</span>
                  <span className="font-mono">{formatPrice(order.depositAmount, currency, language)}</span>
                </div>
                <div className="flex justify-between text-amber-900 dark:text-amber-100 font-black">
                  <span>المتبقي عند الاستلام</span>
                  <span className="font-mono font-bold">
                    {formatPrice(order.remainingAmount || (order.totalAmount - order.depositAmount), currency, language)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-10 pt-6 border-t theme-border text-center text-[10px] text-[var(--text-muted)] space-y-1">
          <p>{isRTL ? 'شكراً لتعاملكم معنا!' : 'Thank you for shopping with us!'}</p>
          <p>{serverSettings?.storeName || 'Auratrix Store'} — All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
}
