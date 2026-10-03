'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '@/store/useSettingsStore';
import { useDialog } from '@/store/useDialogStore';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl } from '@/lib/images';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faRotateLeft, faSearch, faCheckCircle, faBan, faHourglassHalf,
  faMoneyBillWave, faChevronDown, faUser, faBox, faTimes, faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

const STATUS_TABS = [
  { value: 'ALL',       labelAr: 'الكل',       labelEn: 'All' },
  { value: 'REQUESTED', labelAr: 'مطلوب',      labelEn: 'Requested' },
  { value: 'APPROVED',  labelAr: 'تمت الموافقة', labelEn: 'Approved' },
  { value: 'REFUNDED',  labelAr: 'مسترد',      labelEn: 'Refunded' },
  { value: 'REJECTED',  labelAr: 'مرفوض',      labelEn: 'Rejected' },
];

const STATUS_COLORS: Record<string, string> = {
  REQUESTED: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700',
  APPROVED:  'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
  REFUNDED:  'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-300 border-sky-200 dark:border-sky-700',
  REJECTED:  'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-700',
};

const STATUS_ICONS: Record<string, any> = {
  REQUESTED: faHourglassHalf,
  APPROVED:  faCheckCircle,
  REFUNDED:  faMoneyBillWave,
  REJECTED:  faBan,
};

const REASON_LABELS: Record<string, { ar: string; en: string }> = {
  DEFECTIVE:        { ar: 'منتج معيب', en: 'Defective Product' },
  WRONG_ITEM:       { ar: 'منتج مختلف', en: 'Wrong Item' },
  NOT_AS_DESCRIBED: { ar: 'لا يطابق الوصف', en: 'Not as Described' },
  CHANGED_MIND:     { ar: 'تغيير رأي', en: 'Changed Mind' },
  SIZE_ISSUE:       { ar: 'مشكلة مقاس/لون', en: 'Size / Color Issue' },
  OTHER:            { ar: 'سبب آخر', en: 'Other' },
};

const REFUND_METHOD_LABELS: Record<string, { ar: string; en: string }> = {
  ORIGINAL:      { ar: 'وسيلة الدفع الأصلية', en: 'Original Payment' },
  WALLET_POINTS: { ar: 'نقاط الولاء', en: 'Wallet Points' },
  INSTAPAY:      { ar: 'إنستاباي', en: 'InstaPay' },
  BANK:          { ar: 'تحويل بنكي', en: 'Bank Transfer' },
};

export default function AdminReturnsClient() {
  const { language, currency } = useSettings();
  const dialog = useDialog();
  const isRTL = language === 'ar';

  const [returns, setReturns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const fetchReturns = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.set('status', activeTab);
      params.set('limit', '100');
      const res = await fetch(`/api/returns?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setReturns(data.returns || []);
        setTotal(data.total || 0);
      }
    } catch (_) {} finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchReturns(); }, [fetchReturns]);

  const filteredReturns = returns.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const cust = r.user?.name || r.order?.guestInfo || '';
    return (
      r.id.toLowerCase().includes(q) ||
      r.orderId.toLowerCase().includes(q) ||
      cust.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  });

  const handleUpdateStatus = async (returnId: string, newStatus: string) => {
    const confirmed = await dialog.confirm({
      title: isRTL ? 'تأكيد تحديث الحالة' : 'Confirm Status Update',
      message: isRTL
        ? `هل تريد تغيير حالة الطلب إلى "${newStatus}"؟`
        : `Change status to "${newStatus}"?`,
      confirmText: isRTL ? 'تحديث' : 'Update',
      variant: 'info',
    });
    if (!confirmed) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/returns/${returnId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, adminNotes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setReturns((prev) => prev.map((r) => r.id === returnId ? updated : r));
        if (selectedReturn?.id === returnId) setSelectedReturn(updated);
      }
    } catch (_) {} finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!selectedReturn) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/returns/${selectedReturn.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminNotes }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedReturn(updated);
        setReturns((prev) => prev.map((r) => r.id === selectedReturn.id ? updated : r));
      }
    } catch (_) {} finally {
      setUpdating(false);
    }
  };

  const getNextStatuses = (current: string): string[] => {
    const transitions: Record<string, string[]> = {
      REQUESTED: ['APPROVED', 'REJECTED'],
      APPROVED:  ['REFUNDED', 'REJECTED'],
      REFUNDED:  [],
      REJECTED:  [],
    };
    return transitions[current] || [];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
            <FontAwesomeIcon icon={faRotateLeft} className="text-orange-500" />
            <span>{isRTL ? 'طلبات الإرجاع والاسترداد' : 'Return & Refund Requests'}</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {total} {isRTL ? 'طلب إرجاع إجمالاً' : 'total return requests'}
          </p>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map((tab) => {
          const count = tab.value === 'ALL' ? total : returns.filter((r) => r.status === tab.value).length;
          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition ${
                activeTab === tab.value
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                  : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-indigo-400 hover:text-[var(--text-primary)]'
              }`}
            >
              <span>{isRTL ? tab.labelAr : tab.labelEn}</span>
              {count > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === tab.value ? 'bg-white/20' : 'bg-[var(--bg-card)]'
                }`}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isRTL ? 'بحث بالاسم أو رقم الطلب...' : 'Search by name or order ID...'}
          className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl ps-9 pe-4 py-2.5 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)]"
        />
        <FontAwesomeIcon icon={faSearch} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Returns List */}
        <div className="lg:col-span-2 space-y-3">
          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredReturns.length === 0 ? (
            <div className="glass-panel py-16 text-center rounded-2xl border theme-border">
              <FontAwesomeIcon icon={faRotateLeft} className="text-4xl text-[var(--text-muted)] mb-3" />
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {isRTL ? 'لا توجد طلبات إرجاع' : 'No return requests'}
              </p>
            </div>
          ) : (
            filteredReturns.map((ret) => {
              const reasonLabel = REASON_LABELS[ret.reason] || { ar: ret.reason, en: ret.reason };
              const refundLabel = REFUND_METHOD_LABELS[ret.refundMethod] || { ar: ret.refundMethod, en: ret.refundMethod };
              const isSelected = selectedReturn?.id === ret.id;

              return (
                <div
                  key={ret.id}
                  onClick={() => {
                    setSelectedReturn(ret);
                    setAdminNotes(ret.adminNotes || '');
                  }}
                  className={`glass-card rounded-2xl border p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo-500 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-500/10'
                      : 'theme-border hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 flex items-center justify-center flex-shrink-0">
                        <FontAwesomeIcon icon={faRotateLeft} />
                      </div>
                      <div>
                        <p className="text-xs font-extrabold text-[var(--text-primary)]">
                          {ret.user?.name || (isRTL ? 'عميل' : 'Customer')}
                        </p>
                        <p className="text-[10px] text-[var(--text-secondary)]">
                          {isRTL ? 'طلب' : 'Order'} #{ret.orderId.slice(0, 10).toUpperCase()}
                        </p>
                        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                          {isRTL ? reasonLabel.ar : reasonLabel.en}
                          {' • '}
                          {isRTL ? refundLabel.ar : refundLabel.en}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${STATUS_COLORS[ret.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                        <FontAwesomeIcon icon={STATUS_ICONS[ret.status] || faHourglassHalf} className="text-[9px]" />
                        {ret.status}
                      </span>
                      <span className="text-[10px] text-[var(--text-muted)]">
                        {new Date(ret.createdAt).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Order Total */}
                  {ret.order?.totalAmount && (
                    <div className="mt-2 pt-2 border-t theme-border flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">{isRTL ? 'إجمالي الطلب' : 'Order Total'}</span>
                      <span className="font-bold font-mono text-indigo-600 dark:text-indigo-400">
                        {formatPrice(ret.order.totalAmount, currency, language)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedReturn ? (
            <div className="glass-panel rounded-2xl border theme-border p-5 space-y-5 sticky top-20">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b theme-border">
                <h3 className="text-sm font-extrabold text-[var(--text-primary)]">
                  {isRTL ? 'تفاصيل الطلب' : 'Request Details'}
                </h3>
                <button
                  onClick={() => setSelectedReturn(null)}
                  className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition"
                >
                  <FontAwesomeIcon icon={faTimes} className="text-xs" />
                </button>
              </div>

              {/* Status Badge */}
              <div className="text-center">
                <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1.5 rounded-xl border ${STATUS_COLORS[selectedReturn.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                  <FontAwesomeIcon icon={STATUS_ICONS[selectedReturn.status] || faHourglassHalf} />
                  {selectedReturn.status}
                </span>
              </div>

              {/* Customer Info */}
              <div className="space-y-2 text-xs">
                <p className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                  {isRTL ? 'العميل' : 'Customer'}
                </p>
                <div className="bg-[var(--bg-card)] border theme-border rounded-xl p-3 space-y-1">
                  <p className="flex items-center gap-1.5 text-[var(--text-primary)] font-semibold">
                    <FontAwesomeIcon icon={faUser} className="text-indigo-500 text-[10px]" />
                    {selectedReturn.user?.name || 'Guest'}
                  </p>
                  {selectedReturn.user?.email && (
                    <p className="text-[var(--text-secondary)]">{selectedReturn.user.email}</p>
                  )}
                  {selectedReturn.user?.phone && (
                    <p className="text-[var(--text-secondary)]">{selectedReturn.user.phone}</p>
                  )}
                </div>
              </div>

              {/* Order Items */}
              {selectedReturn.order?.orderItems?.length > 0 && (
                <div className="space-y-2 text-xs">
                  <p className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                    {isRTL ? 'محتويات الطلب' : 'Order Items'}
                  </p>
                  <div className="bg-[var(--bg-card)] border theme-border rounded-xl p-3 space-y-1.5">
                    {selectedReturn.order.orderItems.map((item: any) => (
                      <div key={item.id} className="flex justify-between text-[var(--text-secondary)]">
                        <span className="flex items-center gap-1">
                          <FontAwesomeIcon icon={faBox} className="text-[9px] text-[var(--text-muted)]" />
                          {item.product?.title} × {item.quantity}
                        </span>
                        <span className="font-mono font-semibold text-[var(--text-primary)]">
                          {formatPrice(item.price * item.quantity, currency, language)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-1.5 border-t theme-border flex justify-between font-extrabold text-[var(--text-primary)]">
                      <span>{isRTL ? 'الإجمالي' : 'Total'}</span>
                      <span className="text-indigo-600 font-mono">{formatPrice(selectedReturn.order.totalAmount, currency, language)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Return Details */}
              <div className="space-y-2 text-xs">
                <p className="font-bold text-[var(--text-muted)] uppercase tracking-wider text-[10px]">
                  {isRTL ? 'تفاصيل الإرجاع' : 'Return Details'}
                </p>
                <div className="bg-[var(--bg-card)] border theme-border rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-secondary)]">{isRTL ? 'السبب' : 'Reason'}</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {isRTL
                        ? (REASON_LABELS[selectedReturn.reason]?.ar || selectedReturn.reason)
                        : (REASON_LABELS[selectedReturn.reason]?.en || selectedReturn.reason)}
                    </span>
                  </div>
                  {selectedReturn.reasonDetails && (
                    <p className="text-[var(--text-secondary)] italic border-t theme-border pt-1.5 mt-1.5">
                      "{selectedReturn.reasonDetails}"
                    </p>
                  )}
                  <div className="flex justify-between border-t theme-border pt-1.5">
                    <span className="text-[var(--text-secondary)]">{isRTL ? 'طريقة الاسترداد' : 'Refund Method'}</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {isRTL
                        ? (REFUND_METHOD_LABELS[selectedReturn.refundMethod]?.ar || selectedReturn.refundMethod)
                        : (REFUND_METHOD_LABELS[selectedReturn.refundMethod]?.en || selectedReturn.refundMethod)}
                    </span>
                  </div>
                  {selectedReturn.refundDetails && (
                    <p className="text-indigo-600 dark:text-indigo-400 font-mono text-[10px] border-t theme-border pt-1.5 mt-1.5">
                      {selectedReturn.refundDetails}
                    </p>
                  )}
                </div>
              </div>

              {/* Admin Notes */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  {isRTL ? 'ملاحظات الإدارة (داخلية)' : 'Admin Notes (Internal)'}
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  placeholder={isRTL ? 'أضف ملاحظة داخلية...' : 'Add internal note...'}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-[11px] rounded-xl px-3 py-2 border theme-border focus:outline-none focus:border-indigo-500 placeholder-[var(--text-muted)] resize-none"
                />
                <button
                  onClick={handleSaveNotes}
                  disabled={updating}
                  className="w-full py-1.5 text-[11px] font-bold rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border theme-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
                >
                  {isRTL ? 'حفظ الملاحظات' : 'Save Notes'}
                </button>
              </div>

              {/* Status Transitions */}
              {getNextStatuses(selectedReturn.status).length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    {isRTL ? 'تحديث الحالة' : 'Update Status'}
                  </p>
                  <div className="flex flex-col gap-2">
                    {getNextStatuses(selectedReturn.status).map((ns) => {
                      const nsColors: Record<string, string> = {
                        APPROVED: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20',
                        REFUNDED: 'bg-sky-600 hover:bg-sky-500 shadow-sky-600/20',
                        REJECTED: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20',
                      };
                      return (
                        <button
                          key={ns}
                          onClick={() => handleUpdateStatus(selectedReturn.id, ns)}
                          disabled={updating}
                          className={`flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold text-white shadow-md transition disabled:opacity-60 ${nsColors[ns] || 'bg-indigo-600 hover:bg-indigo-500'}`}
                        >
                          <FontAwesomeIcon icon={STATUS_ICONS[ns] || faArrowRight} className="text-[10px]" />
                          <span>
                            {isRTL
                              ? `تغيير إلى "${STATUS_TABS.find((t) => t.value === ns)?.labelAr || ns}"`
                              : `Mark as ${ns}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border theme-border p-8 text-center space-y-3">
              <FontAwesomeIcon icon={faRotateLeft} className="text-3xl text-[var(--text-muted)]" />
              <p className="text-xs text-[var(--text-secondary)]">
                {isRTL ? 'انقر على طلب لعرض تفاصيله' : 'Click a request to view details'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
