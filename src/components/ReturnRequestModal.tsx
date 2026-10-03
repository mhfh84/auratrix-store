'use client';

import React, { useState } from 'react';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTimes, faRotateLeft, faCheckCircle, faExclamationTriangle,
  faSpinner, faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import { formatPrice } from '@/lib/currencies';

interface ReturnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    totalAmount: number;
    createdAt: string | Date;
    orderItems: Array<{
      id: string;
      quantity: number;
      price: number;
      product: { title: string };
    }>;
  };
  onSuccess?: () => void;
}

export default function ReturnRequestModal({ isOpen, onClose, order, onSuccess }: ReturnRequestModalProps) {
  const { language, currency } = useSettings();
  const t = translations[language].returns;
  const isRTL = language === 'ar';

  const [reason, setReason] = useState('');
  const [reasonDetails, setReasonDetails] = useState('');
  const [refundMethod, setRefundMethod] = useState('ORIGINAL');
  const [refundDetails, setRefundDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const returnReasonsList = [
    { value: 'DEFECTIVE', label: t.reasons.DEFECTIVE },
    { value: 'WRONG_ITEM', label: t.reasons.WRONG_ITEM },
    { value: 'NOT_AS_DESCRIBED', label: t.reasons.NOT_AS_DESCRIBED },
    { value: 'CHANGED_MIND', label: t.reasons.CHANGED_MIND },
    { value: 'SIZE_ISSUE', label: t.reasons.SIZE_ISSUE },
    { value: 'OTHER', label: t.reasons.OTHER },
  ];

  const refundMethodsList = [
    { value: 'ORIGINAL', label: t.refundMethods.ORIGINAL },
    { value: 'WALLET_POINTS', label: t.refundMethods.WALLET_POINTS },
    { value: 'INSTAPAY', label: t.refundMethods.INSTAPAY },
    { value: 'BANK', label: t.refundMethods.BANK },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError(t.selectReason);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          reason,
          reasonDetails: reasonDetails.trim() || null,
          refundMethod,
          refundDetails: refundDetails.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.requestFailed);

      setSuccess(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || t.requestFailed);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setReasonDetails('');
    setRefundMethod('ORIGINAL');
    setRefundDetails('');
    setError('');
    setSuccess(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--bg-surface)] text-[var(--text-primary)] border theme-border rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b theme-border sticky top-0 bg-[var(--bg-surface)] z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center">
              <FontAwesomeIcon icon={faRotateLeft} />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
                {t.modalTitle}
              </h2>
              <p className="text-[10px] text-[var(--text-secondary)]">
                #{order.id.slice(0, 10).toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition"
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {success ? (
          /* Success State */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 text-3xl flex items-center justify-center mx-auto">
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>
            <h3 className="text-base font-extrabold text-[var(--text-primary)]">
              {t.requestSuccess}
            </h3>
            <button
              onClick={handleClose}
              className="mt-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
            >
              {translations[language].dialog?.okBtn || 'OK'}
            </button>
          </div>
        ) : (
          /* Form */
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* Order Summary */}
            <div className="bg-[var(--bg-card)] border theme-border rounded-xl p-4 text-xs space-y-2">
              <p className="font-bold text-[var(--text-primary)] mb-1.5">{translations[language].checkout?.orderSummary || 'Order Summary'}</p>
              {order.orderItems.map((item) => (
                <div key={item.id} className="flex justify-between text-[var(--text-secondary)]">
                  <span>{item.product.title} × {item.quantity}</span>
                  <span className="font-mono font-semibold">{formatPrice(item.price * item.quantity, currency, language)}</span>
                </div>
              ))}
              <div className="pt-2 border-t theme-border flex justify-between font-extrabold text-[var(--text-primary)]">
                <span>{translations[language].checkout?.total || 'Total'}</span>
                <span className="text-indigo-600 font-mono">{formatPrice(order.totalAmount, currency, language)}</span>
              </div>
            </div>

            {/* Reason Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                {t.selectReason}
              </label>
              <div className="relative">
                <select
                  id="return-reason"
                  value={reason}
                  onChange={(e) => { setReason(e.target.value); setError(''); }}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2.5 border theme-border focus:outline-none focus:border-indigo-500 appearance-none pr-8 transition"
                  required
                >
                  <option value="">{t.selectReason}</option>
                  {returnReasonsList.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <FontAwesomeIcon icon={faChevronDown} className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[10px] pointer-events-none" />
              </div>
            </div>

            {/* Additional Details */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                {t.reasonDetails}
              </label>
              <textarea
                id="return-details"
                value={reasonDetails}
                onChange={(e) => setReasonDetails(e.target.value)}
                rows={3}
                placeholder={t.reasonDetailsPlaceholder}
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2.5 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)] resize-none transition"
              />
            </div>

            {/* Refund Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                {t.refundMethodLabel}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {refundMethodsList.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => { setRefundMethod(m.value); setRefundDetails(''); }}
                    className={`text-[11px] font-bold py-2 px-3 rounded-xl border transition text-start ${
                      refundMethod === m.value
                        ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-400'
                        : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-indigo-300 hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Refund account details (for bank/instapay) */}
            {(refundMethod === 'INSTAPAY' || refundMethod === 'BANK') && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  {t.refundAccountDetails}
                </label>
                <input
                  type="text"
                  id="refund-details"
                  value={refundDetails}
                  onChange={(e) => setRefundDetails(e.target.value)}
                  placeholder={t.refundAccountDetailsPlaceholder}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl px-3 py-2.5 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)] transition"
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 px-3 py-2.5 rounded-xl">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              id="btn-submit-return"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white font-bold text-sm rounded-xl shadow-md shadow-orange-600/20 transition"
            >
              {submitting ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon icon={faRotateLeft} />
              )}
              <span>
                {submitting ? t.submitting : t.submitRequest}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
