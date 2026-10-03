'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faTimes, faReceipt, faCheckCircle, faDownload } from '@fortawesome/free-solid-svg-icons';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
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
    guestInfo?: string | null;
    user?: { name: string; email: string } | null;
    orderItems: Array<{
      id: string;
      quantity: number;
      price: number;
      colorName?: string | null;
      product: { title: string };
    }>;
  } | null;
}

export default function InvoiceModal({ isOpen, onClose, order }: InvoiceModalProps) {
  const { language, currency, serverSettings } = useSettings();
  const t = translations[language].invoice;

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !order) return null;

  let guest: any = null;
  if (order.guestInfo) {
    try {
      guest = typeof order.guestInfo === 'string' ? JSON.parse(order.guestInfo) : order.guestInfo;
    } catch (e) {
      guest = null;
    }
  }

  const customerName = guest?.name || order.user?.name || 'Customer';
  const customerEmail = guest?.email || order.user?.email || 'N/A';
  const customerPhone = guest?.phone || (order.user as any)?.phone || 'N/A';
  const addressList = [guest?.address, guest?.city, guest?.state].filter(Boolean);
  const customerAddress = addressList.length > 0 ? addressList.join(', ') : ((order.user as any)?.address || 'N/A');

  const orderDate = new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const subtotal = order.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const handlePrint = () => {
    window.print();
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      {/* Print portal for @media print — only this div is shown during print */}
      <div id="print-portal" style={{ display: 'none' }}>
        <div id="printable-invoice">
          {/* The invoice content is rendered inside the scrollable modal div, but
              during print the browser shows only elements under #printable-invoice via CSS */}
        </div>
      </div>

      <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] border theme-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header toolbar */}
        <div className="flex items-center justify-between p-4 border-b theme-border bg-[var(--bg-card)] sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faReceipt} className="text-indigo-600 text-lg" />
            <span className="text-sm font-extrabold">{t.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/invoice/${order.id}`}
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border theme-border hover:bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs font-bold transition"
            >
              <span>{language === 'ar' ? 'صفحة كاملة' : 'Full Page'}</span>
            </Link>
            <button
              onClick={handlePrint}
              id="btn-print-invoice"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition"
            >
              <FontAwesomeIcon icon={faPrint} />
              <span>{t.print}</span>
            </button>
            <button
              onClick={handlePrint}
              id="btn-download-invoice"
              title={t.savePdfTitle}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 shadow-md shadow-emerald-600/20 transition"
            >
              <FontAwesomeIcon icon={faDownload} />
              <span>{t.savePdf}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface)] transition"
              aria-label="Close"
            >
              <FontAwesomeIcon icon={faTimes} className="text-base" />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div className="p-6 sm:p-8 space-y-6 print:p-0 print:m-0" id="printable-invoice">
          {/* Brand & Invoice Details */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b theme-border">
            <div>
              {serverSettings?.storeLogo ? (
                <div className="flex items-center gap-3 mb-2">
                  <img src={serverSettings.storeLogo} alt={serverSettings.storeName || 'Logo'} className="h-10 max-w-[180px] object-contain" />
                  <h1 className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                    {serverSettings?.storeName || 'STORE'}
                  </h1>
                </div>
              ) : (
                <h1 className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                  {serverSettings?.storeName || 'STORE'}
                </h1>
              )}
              <p className="text-xs text-[var(--text-secondary)] mt-1">{t.officialNote}</p>
              {serverSettings?.contactEmail && (
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{serverSettings.contactEmail}</p>
              )}
              {serverSettings?.contactPhone && (
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{serverSettings.contactPhone}</p>
              )}
            </div>
            <div className="text-start sm:text-end">
              <span className="inline-block px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 text-xs font-black uppercase tracking-wider">
                {t.title}
              </span>
              <p className="text-xs font-bold text-[var(--text-primary)] mt-2 font-mono">{t.invoiceNo} #{order.id.slice(0, 8).toUpperCase()}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{orderDate}</p>
              {order.trackingNumber && (
                <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                  Track: {order.trackingNumber}
                </p>
              )}
            </div>
          </div>

          {/* Customer / Billing Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[var(--bg-card)] p-4 rounded-xl border theme-border text-xs">
            <div>
              <p className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[10px] mb-1">{t.billTo}</p>
              <p className="font-extrabold text-[var(--text-primary)] text-sm">{customerName}</p>
              <p className="text-[var(--text-secondary)] mt-0.5">{customerEmail}</p>
              <p className="text-[var(--text-secondary)] mt-0.5">{customerPhone}</p>
            </div>
            <div className="sm:text-end">
              <p className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[10px] mb-1">{t.address}</p>
              <p className="text-[var(--text-primary)] leading-relaxed">{customerAddress}</p>
              <div className="mt-2 flex sm:justify-end gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/50">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  {order.paymentMethod === 'CARD' ? 'CARD (PAID)' : order.paymentMethod || 'CASH ON DELIVERY'}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b theme-border text-[var(--text-muted)] uppercase tracking-wider font-bold">
                  <th className="text-start py-2.5 px-2">{t.item}</th>
                  <th className="text-center py-2.5 px-2">{t.qty}</th>
                  <th className="text-end py-2.5 px-2">{t.unitPrice}</th>
                  <th className="text-end py-2.5 px-2">{t.lineTotal}</th>
                </tr>
              </thead>
              <tbody className="divide-y theme-border">
                {order.orderItems.map((item) => (
                  <tr key={item.id} className="text-[var(--text-primary)]">
                    <td className="py-3 px-2 font-medium">
                      <div>{item.product.title}</div>
                      {item.colorName && (
                        <span className="text-[10px] text-[var(--text-muted)]">Color: {item.colorName}</span>
                      )}
                    </td>
                    <td className="py-3 px-2 text-center font-bold font-mono">{item.quantity}</td>
                    <td className="py-3 px-2 text-end font-medium">{formatPrice(item.price, currency, language)}</td>
                    <td className="py-3 px-2 text-end font-bold font-mono">
                      {formatPrice(item.price * item.quantity, currency, language)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end pt-4 border-t theme-border">
            <div className="w-full sm:w-64 space-y-2 text-xs">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>{t.subtotal}</span>
                <span className="font-semibold font-mono">{formatPrice(subtotal, currency, language)}</span>
              </div>

              {order.discountAmount && order.discountAmount > 0 ? (
                <div className="flex justify-between text-rose-600 dark:text-rose-400 font-medium">
                  <span>{t.discount}</span>
                  <span className="font-mono">-{formatPrice(order.discountAmount, currency, language)}</span>
                </div>
              ) : null}

              {order.pointsUsed && order.pointsUsed > 0 ? (
                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                  <span>{t.pointsDiscount} ({order.pointsUsed} pts)</span>
                  <span className="font-mono">-{formatPrice(order.pointsUsed / 20, currency, language)}</span>
                </div>
              ) : null}

              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>{t.shipping}</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {order.shippingFee && order.shippingFee > 0
                    ? formatPrice(order.shippingFee, currency, language)
                    : t.standardShipping}
                </span>
              </div>

              {order.paymentMethod === 'COD' && Boolean(serverSettings?.paymentCodExtraFee && serverSettings.paymentCodExtraFee > 0) && (
                <div className="flex justify-between text-amber-700 dark:text-amber-300 font-medium">
                  <span>{t.codFee}</span>
                  <span className="font-mono font-semibold">+{formatPrice(serverSettings.paymentCodExtraFee || 0, currency, language)}</span>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t theme-border text-sm font-extrabold text-[var(--text-primary)]">
                <span>{t.total}</span>
                <span className="text-base text-indigo-600 dark:text-indigo-400 font-black">
                  {formatPrice(order.totalAmount, currency, language)}
                </span>
              </div>

              {Boolean(order.depositAmount && order.depositAmount > 0) && (
                <div className="pt-2 mt-2 border-t border-dashed theme-border space-y-1.5 bg-amber-500/5 p-2.5 rounded-xl border border-amber-500/20">
                  <div className="flex justify-between text-xs text-amber-700 dark:text-amber-300 font-bold">
                    <span>{t.prepaidDeposit}</span>
                    <span className="font-mono">-{formatPrice(order.depositAmount || 0, currency, language)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-black text-[var(--text-primary)] pt-1 border-t border-amber-500/20">
                    <span>{t.balanceDue}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                      {formatPrice(order.remainingAmount || (order.totalAmount - (order.depositAmount || 0)), currency, language)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer note & QR simulation */}
          <div className="pt-6 border-t theme-border flex flex-col sm:flex-row items-center justify-between gap-4 text-[10px] text-[var(--text-muted)]">
            <div className="text-center sm:text-start">
              <p className="font-bold">{serverSettings?.storeName ? `${serverSettings.storeName} e-Commerce Platform` : 'e-Commerce Platform'}</p>
              <p>Certified Tax Invoice • Generated automatically</p>
              <p className="mt-0.5">{new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
            </div>
            <div className="p-2 border theme-border rounded-lg bg-[var(--bg-card)] font-mono text-[9px] text-center">
              <div>QR VERIFICATION CODE</div>
              <div className="font-bold tracking-widest text-indigo-600 mt-0.5">#{order.id.slice(0, 12)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render into body via portal so print isolation works correctly
  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}
