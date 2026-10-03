'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl } from '@/lib/images';
import { getProductUrl } from '@/lib/productUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faBox,
  faClock,
  faReceipt,
  faTruckFast,
  faMapMarkerAlt,
  faUser,
  faPhone,
  faCreditCard,
  faMoneyBillWave,
  faBolt,
  faCoins,
  faMobileScreen,
  faLock,
  faLocationDot,
  faTag,
  faTruck,
  faCalendarAlt,
  faCopy,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import InvoiceModal from '@/components/InvoiceModal';

interface OrderSuccessClientProps {
  order: {
    id: string;
    userId: string | null;
    guestInfo: string | null;
    totalAmount: number;
    promoCode?: string | null;
    discountAmount?: number;
    pointsUsed?: number;
    paymentMethod?: string;
    paymentStatus?: string;
    depositAmount?: number;
    depositStatus?: string;
    remainingAmount?: number;
    trackingNumber?: string | null;
    status: string;
    createdAt: Date | string;
    user?: {
      name: string;
      email: string;
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
      product: { id?: string; title: string; images: string };
    }>;
  };
}

export default function OrderSuccessClient({ order }: OrderSuccessClientProps) {
  const { language, currency, serverSettings } = useSettings();
  const isRTL = language === 'ar';
  const t = translations[language].orderSuccess;
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  let guestInfoObj: any = null;
  try {
    if (order.guestInfo) {
      guestInfoObj = typeof order.guestInfo === 'string' ? JSON.parse(order.guestInfo) : order.guestInfo;
    }
  } catch (e) {}

  const na = '—';
  const buyerName = guestInfoObj?.name || order.user?.name || (isRTL ? 'العميل' : 'Customer');
  const buyerEmail = guestInfoObj?.email || order.user?.email || '';
  const buyerPhone = guestInfoObj?.phone || order.user?.phone || na;
  const buyerGov = guestInfoObj?.state || order.user?.state || '';
  const buyerCity = guestInfoObj?.city || order.user?.city || '';
  const buyerStreet = guestInfoObj?.address || order.user?.address || na;

  const orderCode = `#${order.id.slice(-8).toUpperCase()}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(orderCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Financial Breakdown calculations
  const subtotal = order.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discountAmount = order.discountAmount || 0;
  const pointsUsed = order.pointsUsed || 0;
  const pointsRedemptionRate = serverSettings?.pointsRedemptionRate || 20.0;
  const pointsDiscount = pointsUsed > 0 ? Math.round((pointsUsed / pointsRedemptionRate) * 100) / 100 : 0;
  const promoDiscount = Math.max(0, Math.round((discountAmount - pointsDiscount) * 100) / 100);

  const shippingFee = (serverSettings?.shippingFee && serverSettings.shippingFee > 0) ? serverSettings.shippingFee : 0;
  const codExtraFee = (order.paymentMethod === 'COD' && serverSettings?.paymentCodExtraFee && serverSettings.paymentCodExtraFee > 0)
    ? serverSettings.paymentCodExtraFee
    : 0;

  const depositAmount = order.depositAmount || 0;
  const remainingAmount = order.remainingAmount || (depositAmount > 0 ? Math.max(0, order.totalAmount - depositAmount) : 0);

  // Payment method styling & label
  const getPaymentMethodDetails = () => {
    switch (order.paymentMethod) {
      case 'CARD':
        return {
          label: isRTL ? 'بطاقة دفع إلكتروني (Online Card)' : 'Online Card Payment',
          icon: faCreditCard,
          badgeBg: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800/60',
        };
      case 'INSTAPAY':
        return {
          label: isRTL ? 'تحويل انستاباي (Instapay)' : 'Instapay Instant Transfer',
          icon: faBolt,
          badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60',
        };
      case 'WALLETS':
        return {
          label: isRTL ? 'محافظ إلكترونية (فودافون كاش وغيرها)' : 'Mobile Cash Wallets',
          icon: faMobileScreen,
          badgeBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/60',
        };
      case 'FAWRY':
        return {
          label: isRTL ? 'دفع عبر فوري (Fawry)' : 'Fawry Pay',
          icon: faCoins,
          badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
        };
      case 'COD':
      default:
        return {
          label: isRTL ? 'الدفع نقدًا عند الاستلام (COD)' : 'Cash on Delivery (COD)',
          icon: faMoneyBillWave,
          badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
        };
    }
  };

  const paymentDetails = getPaymentMethodDetails();

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 text-center">

      {/* Header Banner */}
      <div className="glass-panel p-8 sm:p-12 rounded-3xl border theme-border space-y-6 shadow-sm">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto text-emerald-500 text-4xl shadow-xl shadow-emerald-500/10">
          <FontAwesomeIcon icon={faCheckCircle} />
        </div>

        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-3.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-700/50">
            {t.badge}
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
            {t.thankYou} {buyerName}!
          </h1>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <div className="inline-flex items-center gap-2 bg-[var(--bg-surface)] px-3.5 py-1.5 rounded-xl border theme-border shadow-xs text-xs">
              <span className="text-[var(--text-secondary)] font-semibold">{t.orderId}:</span>
              <span className="font-mono text-indigo-600 dark:text-indigo-400 font-black text-sm">{orderCode}</span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="text-[var(--text-muted)] hover:text-indigo-600 transition ms-1"
                title="Copy Order Code"
              >
                <FontAwesomeIcon icon={copiedCode ? faCheck : faCopy} className="text-xs" />
              </button>
            </div>

            {order.trackingNumber && (
              <div className="inline-flex items-center gap-2 bg-indigo-50/70 dark:bg-indigo-950/50 px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800/60 shadow-xs text-xs">
                <FontAwesomeIcon icon={faTruckFast} className="text-indigo-600 dark:text-indigo-400 text-xs" />
                <span className="text-[var(--text-secondary)] font-semibold">{translations[language].tracking.trackingNumber}:</span>
                <span className="font-mono text-indigo-700 dark:text-indigo-300 font-bold">{order.trackingNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Action Toolbar */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setIsInvoiceOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
          >
            <FontAwesomeIcon icon={faReceipt} />
            <span>{translations[language].tracking.viewInvoiceBtn}</span>
          </button>
          <Link
            href={`/track-order?query=${encodeURIComponent(order.trackingNumber || order.id)}`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-card)] border theme-border text-xs font-bold text-[var(--text-primary)] transition shadow-xs"
          >
            <FontAwesomeIcon icon={faTruckFast} className="text-indigo-500" />
            <span>{translations[language].tracking.trackBtn}</span>
          </Link>
        </div>

        {/* Delivery Timeline */}
        <div className="max-w-md mx-auto bg-[var(--bg-surface)] border theme-border p-4 rounded-2xl flex justify-between items-center text-xs shadow-sm">
          <div className="flex flex-col items-center gap-1 text-emerald-600 font-bold">
            <FontAwesomeIcon icon={faCheckCircle} className="text-lg" />
            <span>{t.orderPlaced}</span>
          </div>
          <div className="flex-1 h-0.5 bg-indigo-300 dark:bg-indigo-600/40 mx-2" />
          <div className="flex flex-col items-center gap-1 text-indigo-500 font-bold">
            <FontAwesomeIcon icon={faBox} className="text-lg" />
            <span>{t.processing}</span>
          </div>
          <div className="flex-1 h-0.5 bg-[var(--border-color)] mx-2" />
          <div className="flex flex-col items-center gap-1 text-[var(--text-muted)] font-bold">
            <FontAwesomeIcon icon={faClock} className="text-lg" />
            <span>{t.dispatch}</span>
          </div>
        </div>
      </div>

      {/* Redesigned 2-Column Grid: Delivery Info & Payment Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-start items-stretch">

        {/* 1. DELIVERY INFORMATION CARD */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border theme-border space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="text-indigo-500 text-sm" />
                <span>{t.deliveryInfo}</span>
              </h3>
              <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${order.userId ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' : 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-200 dark:border-sky-800'}`}>
                {order.userId ? t.registeredUser : t.guestCheckout}
              </span>
            </div>

            {/* Recipient & Contact Details */}
            <div className="space-y-3 text-xs">
              <div className="flex items-start gap-3 bg-[var(--bg-surface)] p-3 rounded-2xl border theme-border">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 text-sm mt-0.5">
                  <FontAwesomeIcon icon={faUser} />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block">{t.recipient}</span>
                  <p className="font-extrabold text-[var(--text-primary)] text-sm">{buyerName}</p>
                  {buyerEmail && <p className="text-[11px] text-[var(--text-secondary)] truncate mt-0.5">{buyerEmail}</p>}
                </div>
              </div>

              <div className="flex items-center gap-3 bg-[var(--bg-surface)] p-3 rounded-2xl border theme-border">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0 text-sm">
                  <FontAwesomeIcon icon={faPhone} />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] block">{t.phone}</span>
                  <a href={`tel:${buyerPhone}`} className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-sm hover:underline">
                    {buyerPhone}
                  </a>
                </div>
              </div>

              {/* Location & Address */}
              <div className="bg-[var(--bg-surface)] p-3 rounded-2xl border theme-border space-y-2">
                <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <FontAwesomeIcon icon={faLocationDot} className="text-rose-500 text-xs flex-shrink-0" />
                  <span className="text-[10px] font-bold uppercase text-[var(--text-muted)]">{t.address}</span>
                </div>

                {(buyerGov || buyerCity) && (
                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)] pb-1 border-b theme-border">
                    {buyerGov && <span>{buyerGov}</span>}
                    {buyerGov && buyerCity && <span>•</span>}
                    {buyerCity && <span>{buyerCity}</span>}
                  </div>
                )}

                <p className="text-xs text-[var(--text-primary)] font-medium leading-relaxed whitespace-pre-line">
                  {buyerStreet}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t theme-border flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faTruck} className="text-indigo-500 text-[10px]" />
              <span>{translations[language].checkout.standardShipping}</span>
            </span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {isRTL ? 'توصيل سريع خلال 2 - 4 أيام' : 'Fast Delivery (2-4 Days)'}
            </span>
          </div>
        </div>

        {/* 2. PAYMENT BREAKDOWN CARD */}
        <div className="glass-panel p-6 sm:p-7 rounded-3xl border theme-border space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <h3 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
                <FontAwesomeIcon icon={faReceipt} className="text-indigo-500 text-sm" />
                <span>{t.paymentBreakdown}</span>
              </h3>
              <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${paymentDetails.badgeBg}`}>
                <FontAwesomeIcon icon={paymentDetails.icon} className="text-[10px]" />
                <span>{paymentDetails.label}</span>
              </span>
            </div>

            {/* Itemized Financial Ledger */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center text-[var(--text-secondary)]">
                <span>{translations[language].checkout.subtotal}</span>
                <span className="font-mono font-bold text-[var(--text-primary)]">{formatPrice(subtotal, currency, language)}</span>
              </div>

              {promoDiscount > 0 && (
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold">
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faTag} className="text-[10px]" />
                    <span>{translations[language].checkout.discount} {order.promoCode ? `(${order.promoCode})` : ''}</span>
                  </span>
                  <span className="font-mono">-{formatPrice(promoDiscount, currency, language)}</span>
                </div>
              )}

              {pointsDiscount > 0 && (
                <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-bold">
                  <span className="flex items-center gap-1">
                    <FontAwesomeIcon icon={faCoins} className="text-[10px]" />
                    <span>{translations[language].checkout.pointsDiscount} ({pointsUsed} pts)</span>
                  </span>
                  <span className="font-mono">-{formatPrice(pointsDiscount, currency, language)}</span>
                </div>
              )}

              <div className="flex justify-between items-center text-[var(--text-secondary)]">
                <span>{translations[language].checkout.delivery}</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {shippingFee > 0 ? formatPrice(shippingFee, currency, language) : (isRTL ? 'مجاني' : 'Free')}
                </span>
              </div>

              {codExtraFee > 0 && (
                <div className="flex justify-between items-center text-amber-700 dark:text-amber-300 font-semibold">
                  <span>{translations[language].checkout.codFee}</span>
                  <span className="font-mono">+{formatPrice(codExtraFee, currency, language)}</span>
                </div>
              )}

              {/* Total Order Amount Row */}
              <div className="pt-3 border-t theme-border flex justify-between items-center text-sm font-black text-[var(--text-primary)]">
                <span>{translations[language].checkout.total}</span>
                <span className="text-xl text-indigo-600 dark:text-indigo-400 font-mono">
                  {formatPrice(order.totalAmount, currency, language)}
                </span>
              </div>

              {/* Deposit & Remaining Balance Box (If applicable) */}
              {depositAmount > 0 && (
                <div className="mt-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-800 dark:text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faLock} className="text-amber-500 text-xs" />
                      <span>{translations[language].invoice.prepaidDeposit}</span>
                    </span>
                    <span className="font-mono font-black text-amber-700 dark:text-amber-300">
                      {formatPrice(depositAmount, currency, language)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs font-black text-[var(--text-primary)] pt-1.5 border-t border-amber-500/20">
                    <span>{translations[language].checkout.remainingOnDelivery}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatPrice(remainingAmount, currency, language)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t theme-border flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-xs" />
              <span>{new Date(order.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            </span>
            <span className={`font-black uppercase px-2 py-0.5 rounded-md ${order.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'}`}>
              {order.paymentStatus === 'PAID' ? (isRTL ? 'تم الدفع' : 'Paid') : (isRTL ? 'في انتظار تأكيد الدفع' : 'Pending Payment')}
            </span>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="glass-panel p-6 sm:p-7 rounded-3xl border theme-border text-start space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b theme-border pb-3">
          <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <FontAwesomeIcon icon={faBox} className="text-indigo-500" />
            <span>{t.shipmentItems}</span>
          </h3>
          <span className="text-xs font-bold text-[var(--text-muted)] font-mono">
            {order.orderItems.length} {isRTL ? 'منتجات' : 'items'}
          </span>
        </div>

        <div className="divide-y theme-border">
          {order.orderItems.map((item) => {
            const img = getImageUrl(item.product.images);
            return (
              <div key={item.id} className="flex items-center justify-between py-3 text-xs">
                <div className="flex items-center gap-3.5">
                  <div className="relative w-14 h-14 rounded-xl bg-gray-100 dark:bg-gray-950 overflow-hidden flex-shrink-0 border theme-border">
                    <Image src={img} alt={item.product.title} fill className="object-cover" />
                  </div>
                  <div className="space-y-0.5">
                    {item.product.id ? (
                      <Link href={getProductUrl(item.product)} className="font-bold text-[var(--text-primary)] hover:text-indigo-600 transition hover:underline line-clamp-1">
                        {item.product.title}
                      </Link>
                    ) : (
                      <h4 className="font-bold text-[var(--text-primary)] line-clamp-1">{item.product.title}</h4>
                    )}
                    {item.colorName && (
                      <span className="text-[10px] text-[var(--text-muted)] block">Color: {item.colorName}</span>
                    )}
                    <p className="text-[var(--text-secondary)]">{t.qty} {item.quantity} × {formatPrice(item.price, currency, language)}</p>
                  </div>
                </div>
                <span className="font-black text-[var(--text-primary)] font-mono text-sm">{formatPrice(item.price * item.quantity, currency, language)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-2 flex justify-center gap-4">
        <Link href="/products" className="px-8 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-2xl shadow-xl shadow-indigo-600/25 transition active:scale-95">
          {t.continueShopping}
        </Link>
      </div>

      {/* Printable Invoice Modal */}
      <InvoiceModal isOpen={isInvoiceOpen} onClose={() => setIsInvoiceOpen(false)} order={order as any} />
    </div>
  );
}

