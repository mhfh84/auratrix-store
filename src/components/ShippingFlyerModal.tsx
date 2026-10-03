'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { useToastStore } from '@/store/useToastStore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPrint,
  faTimes,
  faTruck,
  faCopy,
  faCheck,
  faBoxOpen,
  faMoneyBillWave,
  faShieldHalved,
  faExternalLinkAlt,
  faPhone,
  faMapMarkerAlt,
} from '@fortawesome/free-solid-svg-icons';

interface ShippingFlyerOrder {
  id: string;
  createdAt: string | Date;
  totalAmount: number;
  shippingFee?: number;
  discountAmount?: number;
  pointsUsed?: number;
  depositAmount?: number;
  remainingAmount?: number;
  depositStatus?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  adminNotes?: string | null;
  guestInfo?: string | null;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string | null;
    state?: string | null;
    city?: string | null;
    address?: string | null;
  } | null;
  orderItems: Array<{
    id: string;
    quantity: number;
    price: number;
    colorName?: string | null;
    product: {
      id?: string;
      title: string;
      images?: string;
    };
  }>;
}

interface ShippingFlyerModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ShippingFlyerOrder | null;
}

// ── SVG Barcode Component (Code 128 pseudo-pattern generator for crisp vector output) ──
function SvgBarcode({ value, height = 48, className = '' }: { value: string; height?: number; className?: string }) {
  const bars = useMemo(() => {
    const clean = (value || 'AURATRIX').toUpperCase().replace(/[^A-Z0-9-]/g, '');
    const pattern: Array<{ width: number; isSpace: boolean }> = [];
    
    // Start guard
    pattern.push({ width: 3, isSpace: false });
    pattern.push({ width: 1, isSpace: true });
    pattern.push({ width: 2, isSpace: false });
    pattern.push({ width: 2, isSpace: true });

    for (let i = 0; i < clean.length; i++) {
      const code = clean.charCodeAt(i);
      const w1 = (code % 3) + 1;
      const w2 = ((code * 2) % 3) + 1;
      const w3 = ((code * 3) % 2) + 1;
      const w4 = ((code + i) % 3) + 1;
      pattern.push({ width: w1, isSpace: false });
      pattern.push({ width: w2, isSpace: true });
      pattern.push({ width: w3, isSpace: false });
      pattern.push({ width: w4, isSpace: true });
    }

    // Stop guard
    pattern.push({ width: 3, isSpace: false });
    pattern.push({ width: 1, isSpace: true });
    pattern.push({ width: 3, isSpace: false });

    return pattern;
  }, [value]);

  const totalWidth = bars.reduce((sum, b) => sum + b.width, 0);

  let currentX = 0;

  return (
    <div className={`flex flex-col items-center select-none ${className}`}>
      <svg
        viewBox={`0 0 ${totalWidth} ${height}`}
        className="w-full max-w-[280px] h-11"
        preserveAspectRatio="none"
      >
        {bars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width;
          if (bar.isSpace) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={0}
              width={bar.width}
              height={height}
              fill="#000000"
            />
          );
        })}
      </svg>
      <span className="font-mono font-bold tracking-widest text-[11px] text-black mt-0.5">
        *{value.toUpperCase()}*
      </span>
    </div>
  );
}

export default function ShippingFlyerModal({ isOpen, onClose, order }: ShippingFlyerModalProps) {
  const { language, currency, serverSettings } = useSettings();
  const t = translations[language].shippingFlyer;
  const isRTL = language === 'ar';

  const [layoutMode, setLayoutMode] = useState<'standard' | 'compact'>('standard');
  const [copied, setCopied] = useState(false);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  // Parse Guest Info if available
  let guest: any = null;
  if (order.guestInfo) {
    try {
      guest = typeof order.guestInfo === 'string' ? JSON.parse(order.guestInfo) : order.guestInfo;
    } catch {
      guest = null;
    }
  }

  const customerName = guest?.name || order.user?.name || (isRTL ? 'عميل غير مسجل' : 'Valued Customer');
  const customerPhone = guest?.phone || order.user?.phone || '';
  const customerState = guest?.state || order.user?.state || '';
  const customerCity = guest?.city || order.user?.city || '';
  const customerAddress = guest?.address || order.user?.address || '';

  const fullDestinationAddress = [customerState, customerCity, customerAddress]
    .filter(Boolean)
    .join(' — ') || (isRTL ? 'العنوان غير محدد' : 'Address not specified');

  const trackingCode = order.trackingNumber || `AWB-${order.id.slice(-8).toUpperCase()}`;
  const shortOrderId = order.id.slice(-8).toUpperCase();

  // Financials & Cash to collect calculation
  const isPrepaidPaid =
    order.paymentStatus === 'PAID' &&
    order.paymentMethod !== 'COD' &&
    (!order.remainingAmount || order.remainingAmount === 0);

  const depositAmount = order.depositAmount || 0;
  const totalAmount = order.totalAmount || 0;

  // Net Cash to Collect
  let cashToCollect = 0;
  if (isPrepaidPaid) {
    cashToCollect = 0;
  } else if (order.remainingAmount !== undefined && order.remainingAmount !== null) {
    cashToCollect = Math.max(0, order.remainingAmount);
  } else if (depositAmount > 0) {
    cashToCollect = Math.max(0, totalAmount - depositAmount);
  } else {
    cashToCollect = totalAmount;
  }

  const totalItemsQty = (order.orderItems || []).reduce((sum, item) => sum + item.quantity, 0);

  const orderDateStr = new Date(order.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const todayStr = new Date().toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const handlePrint = () => {
    window.print();
  };

  // Copy structured courier dispatch message
  const handleCopyCourierText = async () => {
    const lines = [
      `📦 *بيانات شحنة وتوصيل طلب* 🚚`,
      `━━━━━━━━━━━━━━━━━━`,
      `🏷️ *رقم الطلب:* #${shortOrderId}`,
      order.trackingNumber ? `📍 *رقم البوليصة (AWB):* ${order.trackingNumber}` : null,
      `👤 *اسم العميل:* ${customerName}`,
      `📞 *الهاتف:* ${customerPhone || 'غير متوفر'}`,
      `🏙️ *المحافظة / المدينة:* ${customerState ? `${customerState} - ${customerCity}` : customerCity || 'غير محدد'}`,
      `🏡 *العنوان بالتفصيل:* ${customerAddress}`,
      order.adminNotes ? `📝 *ملاحظات التوصيل:* ${order.adminNotes}` : null,
      `━━━━━━━━━━━━━━━━━━`,
      isPrepaidPaid
        ? `✅ *حالة الدفع:* مدفوع مسبقاً بالكامل (مطلوب تحصيل 0.00 ج.م)`
        : `💰 *المبلغ المطلوب تحصيله نقداً (COD):* ${formatPrice(cashToCollect, currency, language)}`,
      depositAmount > 0 ? `(تم دفع عربون مسبق: ${formatPrice(depositAmount, currency, language)} من إجمالي: ${formatPrice(totalAmount, currency, language)})` : null,
      `━━━━━━━━━━━━━━━━━━`,
      `📦 *محتويات الشحنة (${totalItemsQty} قطعة):*`,
      ...(order.orderItems || []).map(
        (item) => `• ${item.product?.title || 'منتج'}${item.colorName ? ` (${item.colorName})` : ''} × ${item.quantity}`
      ),
      `━━━━━━━━━━━━━━━━━━`,
      `🏪 *الراسل:* ${serverSettings?.storeName || 'Auratrix Store'} ${serverSettings?.contactPhone ? `(${serverSettings.contactPhone})` : ''}`,
    ].filter(Boolean);

    const message = lines.join('\n');

    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      useToastStore.getState().success(t.copiedNotice);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      useToastStore.getState().error(isRTL ? 'تعذر نسخ البيانات' : 'Failed to copy to clipboard');
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      {/* Container Box */}
      <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] border theme-border rounded-2xl w-full max-w-3xl max-h-[94vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* ── Toolbar Header (Hidden in Print) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 sm:p-4 border-b theme-border bg-[var(--bg-card)] sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm font-bold border border-amber-500/20">
              <FontAwesomeIcon icon={faTruck} />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black text-[var(--text-primary)]">
                {t.title}
              </h2>
              <p className="text-[10px] text-[var(--text-muted)] font-mono">
                #{shortOrderId} • {customerName}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Layout switch */}
            <div className="flex items-center bg-[var(--bg-surface)] p-0.5 rounded-xl border theme-border text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setLayoutMode('standard')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  layoutMode === 'standard'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.standardA4}
              </button>
              <button
                type="button"
                onClick={() => setLayoutMode('compact')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  layoutMode === 'compact'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {t.compactLabel}
              </button>
            </div>

            {/* Quick copy for WhatsApp / courier */}
            <button
              type="button"
              onClick={handleCopyCourierText}
              title={t.copyCourierText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 text-xs font-bold transition cursor-pointer"
            >
              <FontAwesomeIcon icon={copied ? faCheck : faCopy} />
              <span className="hidden sm:inline">{t.copyCourierText}</span>
            </button>

            {/* Direct Full Page */}
            <Link
              href={`/admin/orders/${order.id}/shipping-flyer`}
              target="_blank"
              title={t.openFullPage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border theme-border hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold transition"
            >
              <FontAwesomeIcon icon={faExternalLinkAlt} />
              <span className="hidden sm:inline">{t.openFullPage}</span>
            </Link>

            {/* Print Button */}
            <button
              type="button"
              onClick={handlePrint}
              id="btn-print-shipping-flyer"
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-md shadow-indigo-600/20 transition cursor-pointer"
            >
              <FontAwesomeIcon icon={faPrint} />
              <span>{t.print}</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface)] transition"
              aria-label="Close"
            >
              <FontAwesomeIcon icon={faTimes} className="text-sm" />
            </button>
          </div>
        </div>

        {/* ── Printable Area: Standard A4 or Compact Thermal Label ── */}
        <div className="p-4 sm:p-6 print:p-0" id="printable-shipping-flyer">
          {layoutMode === 'standard' ? (
            /* ══════════════════════════════════════════════════════════
               STANDARD A4 / A5 COURIER FLYER & AIRWAY BILL
               ══════════════════════════════════════════════════════════ */
            <div className="bg-white text-slate-900 rounded-2xl border-2 border-slate-900 p-6 sm:p-8 space-y-5 shadow-lg print:shadow-none print:border-2 print:border-black print:rounded-none print:p-4">
              {/* Top Banner: Store Header & Airway Bill Barcode */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b-2 border-slate-900">
                <div className="flex items-center gap-3">
                  {serverSettings?.storeLogo ? (
                    <img
                      src={serverSettings.storeLogo}
                      alt={serverSettings.storeName || 'Store Logo'}
                      className="h-12 max-w-[140px] object-contain"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-xl">
                      <FontAwesomeIcon icon={faTruck} />
                    </div>
                  )}
                  <div>
                    <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                      {serverSettings?.storeName || 'AURATRIX STORE'}
                    </h1>
                    <p className="text-[11px] font-bold text-slate-600">
                      {t.title}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {serverSettings?.contactPhone || serverSettings?.contactEmail || ''}
                    </p>
                  </div>
                </div>

                {/* Barcode & Reference */}
                <div className="text-start sm:text-end w-full sm:w-auto">
                  <div className="inline-block bg-slate-100 p-2 rounded-xl border border-slate-300">
                    <SvgBarcode value={trackingCode} height={36} />
                  </div>
                </div>
              </div>

              {/* Order Meta Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-100 p-3 rounded-xl border border-slate-300 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">{t.orderNumber}</span>
                  <span className="font-mono font-black text-slate-900">#{shortOrderId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">{t.trackingNumber}</span>
                  <span className="font-mono font-black text-indigo-700">{order.trackingNumber || shortOrderId}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">{t.orderDate}</span>
                  <span className="font-semibold text-slate-800">{orderDateStr}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">{t.dispatchDate}</span>
                  <span className="font-semibold text-slate-800">{todayStr}</span>
                </div>
              </div>

              {/* Sender & Recipient Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Consignee / Recipient (TO) - HIGHLIGHTED */}
                <div className="border-2 border-slate-900 bg-slate-50 p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-300">
                    <span className="font-black text-slate-900 uppercase text-[11px] flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faMapMarkerAlt} className="text-rose-600" />
                      {t.recipientTitle} (TO)
                    </span>
                    {customerState && (
                      <span className="px-2.5 py-0.5 rounded-md bg-slate-900 text-white font-extrabold text-[11px]">
                        {customerState}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">{t.name}</span>
                    <p className="text-base font-black text-slate-900">{customerName}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 block">{t.phone}</span>
                      <p className="font-mono font-black text-sm text-slate-900 flex items-center gap-1">
                        <FontAwesomeIcon icon={faPhone} className="text-[10px] text-slate-400" />
                        {customerPhone || '—'}
                      </p>
                    </div>
                    {customerCity && (
                      <div>
                        <span className="text-[10px] text-slate-500 block">{t.city}</span>
                        <p className="font-bold text-slate-800">{customerCity}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">{t.address}</span>
                    <p className="font-bold text-slate-900 leading-snug">{customerAddress || fullDestinationAddress}</p>
                  </div>

                  {order.adminNotes && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-amber-700 block">{t.notes}</span>
                      <p className="text-[11px] font-semibold text-slate-800 bg-amber-50 p-1.5 rounded border border-amber-200">
                        {order.adminNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Shipper / Store (FROM) */}
                <div className="border border-slate-300 p-4 rounded-xl space-y-2 bg-white">
                  <div className="pb-1.5 border-b border-slate-200">
                    <span className="font-bold text-slate-600 uppercase text-[11px]">
                      {t.senderTitle} (FROM)
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">{serverSettings?.storeName || 'Auratrix Store'}</span>
                    <p className="font-extrabold text-slate-900">{serverSettings?.storeName || 'Auratrix Store'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.phone}</span>
                    <p className="font-mono font-bold text-slate-800">{serverSettings?.contactPhone || '—'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">{t.address}</span>
                    <p className="text-slate-700">
                      {serverSettings?.contactEmail || 'Warehouse Hub & Dispatch Center'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200 text-[10px] text-slate-500 space-y-0.5">
                    <p>{t.storeNotice}</p>
                  </div>
                </div>
              </div>

              {/* ══════════════════════════════════════════════════════════
                  CRITICAL: CASH COLLECTION / COD SECTION (COURIER BOX)
                  ══════════════════════════════════════════════════════════ */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border-4 ${
                  isPrepaidPaid
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-950'
                    : 'border-slate-900 bg-amber-50/80 text-slate-900'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <FontAwesomeIcon
                        icon={isPrepaidPaid ? faShieldHalved : faMoneyBillWave}
                        className={`text-xl ${isPrepaidPaid ? 'text-emerald-600' : 'text-amber-600'}`}
                      />
                      <span className="text-xs font-black uppercase tracking-wider">
                        {isPrepaidPaid ? t.paidTitle : t.codTitle}
                      </span>
                    </div>
                    <p className="text-[11px] font-bold max-w-md">
                      {isPrepaidPaid ? t.paidInstructions : t.codInstructions}
                    </p>
                  </div>

                  {/* Cash Amount Highlight */}
                  <div className="text-start sm:text-end w-full sm:w-auto bg-white p-3.5 rounded-xl border-2 border-slate-900 shadow-sm">
                    <span className="text-[10px] font-black text-slate-600 uppercase block">
                      {isPrepaidPaid ? t.paidZeroCollect : t.codCollectAmount}
                    </span>
                    <p className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-slate-900 pt-0.5">
                      {isPrepaidPaid
                        ? '0.00 ' + currency
                        : formatPrice(cashToCollect, currency, language)}
                    </p>
                    {depositAmount > 0 && (
                      <p className="text-[10px] font-bold text-amber-700 mt-0.5">
                        {t.breakdownDeposit} {formatPrice(depositAmount, currency, language)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Sub-breakdown in COD */}
                {!isPrepaidPaid && (
                  <div className="mt-3 pt-3 border-t border-slate-300/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="text-slate-600">
                      {t.breakdownTotal} <strong className="text-slate-900">{formatPrice(totalAmount, currency, language)}</strong>
                    </span>
                    {depositAmount > 0 && (
                      <span className="text-amber-800">
                        {t.breakdownDeposit} <strong>-{formatPrice(depositAmount, currency, language)}</strong>
                      </span>
                    )}
                    <span className="font-extrabold text-slate-900">
                      {t.breakdownRemaining} <strong className="text-indigo-700">{formatPrice(cashToCollect, currency, language)}</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* ══════════════════════════════════════════════════════════
                  PACKAGE CONTENTS / PACKING SLIP TABLE
                  ══════════════════════════════════════════════════════════ */}
              <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
                <div className="bg-slate-100 px-4 py-2 border-b border-slate-300 flex items-center justify-between">
                  <span className="font-black text-slate-900 uppercase flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faBoxOpen} className="text-slate-600" />
                    {t.contentsTitle}
                  </span>
                  <span className="font-bold text-slate-700">
                    {t.totalItemsCount} <span className="font-mono font-black">{totalItemsQty}</span>
                  </span>
                </div>

                <table className="w-full text-start">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black text-slate-500 uppercase">
                      <th className="py-2 px-3 text-start">#</th>
                      <th className="py-2 px-3 text-start">{t.item}</th>
                      <th className="py-2 px-3 text-start">{t.variant}</th>
                      <th className="py-2 px-3 text-center">{t.qty}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-semibold">
                    {(order.orderItems || []).map((item, idx) => (
                      <tr key={item.id} className="text-slate-900">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{idx + 1}</td>
                        <td className="py-2 px-3 font-bold">{item.product?.title || 'Product'}</td>
                        <td className="py-2 px-3 text-slate-600 text-[11px]">{item.colorName || '—'}</td>
                        <td className="py-2 px-3 text-center font-mono font-black text-sm">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ══════════════════════════════════════════════════════════
                  COURIER & RECIPIENT SIGN-OFF PROOF OF DELIVERY
                  ══════════════════════════════════════════════════════════ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
                <div className="border border-slate-300 p-3 rounded-xl space-y-4">
                  <span className="font-black text-slate-700 text-[11px] block uppercase">
                    {t.recipientSign}
                  </span>
                  <div className="border-b border-dashed border-slate-400 h-8" />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{t.deliveryDate}: _____/_____/202___</span>
                    <span>{t.conditionCheck}</span>
                  </div>
                </div>

                <div className="border border-slate-300 p-3 rounded-xl space-y-4">
                  <span className="font-black text-slate-700 text-[11px] block uppercase">
                    {t.courierSign}
                  </span>
                  <div className="border-b border-dashed border-slate-400 h-8" />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{t.courierName}: ____________________</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ══════════════════════════════════════════════════════════
               COMPACT THERMAL / ADHESIVE SHIPPING LABEL (A5 / 4x6)
               ══════════════════════════════════════════════════════════ */
            <div className="max-w-md mx-auto bg-white text-black border-4 border-black p-4 space-y-3 rounded-xl print:rounded-none print:border-4 print:p-3">
              {/* Header */}
              <div className="flex items-center justify-between border-b-2 border-black pb-2">
                <div>
                  <h1 className="text-base font-black uppercase tracking-tight">
                    {serverSettings?.storeName || 'AURATRIX STORE'}
                  </h1>
                  <span className="text-[10px] font-bold text-slate-600">{t.title}</span>
                </div>
                <span className="font-mono font-black text-sm px-2 py-0.5 bg-black text-white rounded">
                  #{shortOrderId}
                </span>
              </div>

              {/* Barcode */}
              <div className="py-1 flex justify-center border-b border-black">
                <SvgBarcode value={trackingCode} height={36} />
              </div>

              {/* Recipient Destination - ULTRA PROMINENT */}
              <div className="border-2 border-black bg-slate-50 p-2.5 rounded-lg space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase bg-black text-white px-1.5 py-0.5 rounded">
                    DELIVER TO:
                  </span>
                  {customerState && (
                    <span className="font-black text-xs px-2 py-0.5 bg-slate-200 border border-black rounded">
                      {customerState}
                    </span>
                  )}
                </div>

                <p className="text-sm font-black text-black">{customerName}</p>

                <p className="font-mono font-black text-base text-black flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faPhone} className="text-xs" />
                  {customerPhone || 'NO PHONE'}
                </p>

                <p className="font-bold text-slate-900 text-xs leading-snug">
                  {fullDestinationAddress}
                </p>

                {order.adminNotes && (
                  <p className="text-[10px] font-bold text-black border-t border-slate-300 pt-1">
                    ⚠️ {order.adminNotes}
                  </p>
                )}
              </div>

              {/* COD / CASH TO COLLECT - MASSIVE BOX */}
              <div
                className={`p-3 rounded-lg border-2 ${
                  isPrepaidPaid
                    ? 'border-emerald-700 bg-emerald-100 text-emerald-950'
                    : 'border-black bg-amber-100 text-black'
                } text-center space-y-1`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider block">
                  {isPrepaidPaid ? 'PREPAID — ZERO CASH (0.00)' : 'CASH TO COLLECT FROM CUSTOMER'}
                </span>
                <p className="text-2xl font-black font-mono">
                  {isPrepaidPaid
                    ? 'PAID (0.00 ' + currency + ')'
                    : formatPrice(cashToCollect, currency, language)}
                </p>
                <p className="text-[9px] font-bold">
                  {isPrepaidPaid ? t.paidInstructions : t.codInstructions}
                </p>
              </div>

              {/* Items List (Compact) */}
              <div className="border border-black p-2 rounded text-[11px] space-y-1">
                <div className="flex justify-between font-black text-[10px] border-b border-slate-300 pb-0.5">
                  <span>ITEMS ({totalItemsQty}):</span>
                  <span>QTY</span>
                </div>
                {(order.orderItems || []).map((item) => (
                  <div key={item.id} className="flex justify-between font-semibold">
                    <span className="truncate max-w-[240px]">
                      {item.product?.title}{item.colorName ? ` (${item.colorName})` : ''}
                    </span>
                    <span className="font-mono font-bold">×{item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* Signatures */}
              <div className="border-t-2 border-black pt-2 flex justify-between text-[10px]">
                <div>
                  <span>Recipient Sign: __________________</span>
                </div>
                <div>
                  <span>Date: ___/___/202___</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
