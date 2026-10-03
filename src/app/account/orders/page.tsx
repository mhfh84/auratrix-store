'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useSettings } from '@/store/useSettingsStore';
import { useDialog } from '@/store/useDialogStore';
import { useToastStore } from '@/store/useToastStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl } from '@/lib/images';
import { getProductUrl } from '@/lib/productUrl';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClipboardList,
  faReceipt,
  faTruckFast,
  faArrowLeft,
  faBoxes,
  faCheckCircle,
  faClock,
  faBan,
  faRotateLeft,
  faHourglassHalf,
  faSpinner,
  faArrowUpRightFromSquare,
  faLock,
  faTimeline,
} from '@fortawesome/free-solid-svg-icons';
import InvoiceModal from '@/components/InvoiceModal';
import ReturnRequestModal from '@/components/ReturnRequestModal';

export default function AccountOrdersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const dialog = useDialog();
  const { language, currency } = useSettings();
  const t = translations[language].account;
  const isRTL = language === 'ar';

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<any>(null);
  const [returnOrder, setReturnOrder] = useState<any>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
  // Track which orders already have an active return request
  const [returnedOrderIds, setReturnedOrderIds] = useState<Set<string>>(new Set());

  const fetchOrders = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);

      const res = await fetch(`/api/account/orders?page=${pageNum}&limit=8`);
      if (res.ok) {
        const data = await res.json();
        const incomingOrders = data.orders || [];
        setOrders((prev) => (append ? [...prev, ...incomingOrders] : incomingOrders));
        setTotalPages(data.totalPages || 1);
        setTotalOrders(data.total || 0);
        setHasMore(data.hasMore ?? false);
        setPage(pageNum);
      }
    } catch {
      console.error('Failed to load account orders');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  const fetchMyReturns = useCallback(async () => {
    try {
      const res = await fetch('/api/returns');
      if (res.ok) {
        const data = await res.json();
        const activeReturnOrderIds = new Set<string>(
          (data.returns || [])
            .filter((r: any) => ['REQUESTED', 'APPROVED'].includes(r.status))
            .map((r: any) => r.orderId)
        );
        setReturnedOrderIds(activeReturnOrderIds);
      }
    } catch {
      // Quietly handle
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/account/orders');
      return;
    }

    if (status === 'authenticated') {
      fetchOrders(1, false);
      fetchMyReturns();
    }
  }, [status, router, fetchOrders, fetchMyReturns]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      fetchOrders(page + 1, true);
    }
  };

  const handleCancelOrder = async (order: any) => {
    const confirmed = await dialog.confirm({
      title: t.confirmCancelTitle,
      message: t.confirmCancelMsg,
      confirmText: t.yesCancelOrder,
      cancelText: t.keepOrder,
      variant: 'danger',
    });

    if (!confirmed) return;

    setCancellingOrderId(order.id);
    try {
      const res = await fetch(`/api/orders/${order.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t.cancelOrderFailed);
      }
      useToastStore.getState().success(t.cancelOrderSuccess);
      setOrders((prev) =>
        prev.map((o) => (o.id === order.id ? { ...o, status: 'CANCELLED' } : o))
      );
    } catch (err: any) {
      useToastStore.getState().error(err.message || t.cancelOrderFailed);
    } finally {
      setCancellingOrderId(null);
    }
  };

  const getStatusBadge = (orderStatus: string) => {
    switch (orderStatus) {
      case 'DELIVERED':
        return (
          <span className="bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 font-bold px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-700/50 flex items-center gap-1">
            <FontAwesomeIcon icon={faCheckCircle} />
            <span>{t.statusDelivered}</span>
          </span>
        );
      case 'SHIPPED':
        return (
          <span className="bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-300 font-bold px-2.5 py-1 rounded-lg border border-sky-200 dark:border-sky-700/50 flex items-center gap-1">
            <FontAwesomeIcon icon={faTruckFast} />
            <span>{t.statusShipped}</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 font-bold px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-700/50 flex items-center gap-1">
            <FontAwesomeIcon icon={faBoxes} />
            <span>{t.statusProcessing}</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-300 font-bold px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-700/50 flex items-center gap-1">
            <FontAwesomeIcon icon={faBan} />
            <span>{t.statusCancelled}</span>
          </span>
        );
      default:
        return (
          <span className="bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300 font-bold px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-700/50 flex items-center gap-1">
            <FontAwesomeIcon icon={faClock} />
            <span>{t.statusPending}</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b theme-border">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/account"
              className="p-1.5 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition"
              title="Back to Account"
            >
              <FontAwesomeIcon icon={faArrowLeft} className={language === 'ar' ? 'rotate-180' : ''} />
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">{t.orderHistory}</h1>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {totalOrders} {t.orderHistory}
          </p>
        </div>

        <Link
          href="/products"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
        >
          <FontAwesomeIcon icon={faBoxes} />
          <span>{t.browseProducts}</span>
        </Link>
      </div>

      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 rounded-2xl bg-[var(--bg-card)] border theme-border" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-3xl border theme-border space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center text-2xl mx-auto">
            <FontAwesomeIcon icon={faClipboardList} />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{t.noOrders}</p>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
          >
            {t.shopNow}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const isDelivered = order.status === 'DELIVERED';
            const canCancel = order.status === 'PENDING' || order.status === 'PROCESSING';
            const hasActiveReturn = returnedOrderIds.has(order.id);

            return (
              <div
                key={order.id}
                className="glass-card rounded-2xl border theme-border p-5 space-y-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b theme-border text-xs">
                  <div>
                    <span className="font-mono font-bold text-[var(--text-primary)] text-sm">
                      #{order.id.slice(0, 10).toUpperCase()}
                    </span>
                    <span className="text-[var(--text-muted)] ms-3">
                      {new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {order.trackingNumber && (
                      <Link
                        href={`/track-order?query=${encodeURIComponent(order.trackingNumber)}`}
                        className="block sm:inline sm:ms-3 text-[11px] font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline hover:text-indigo-700 dark:hover:text-indigo-300 transition"
                        title={isRTL ? 'اضغط لتتبع هذه الشحنة مباشرة' : 'Click to track this shipment'}
                      >
                        <FontAwesomeIcon icon={faTruckFast} className="me-1 text-[10px]" />
                        Track: {order.trackingNumber}
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {getStatusBadge(order.status)}
                    <div className="text-end">
                      <span className="text-base font-black text-indigo-600 dark:text-indigo-400 font-mono block">
                        {formatPrice(order.totalAmount, currency, language)}
                      </span>
                      {Boolean(order.depositAmount && order.depositAmount > 0) && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                          {t.depositLabel} {formatPrice(order.depositAmount, currency, language)} (
                          {order.depositStatus === 'VERIFIED'
                            ? (t.verified)
                            : (translations[language].returns.statusRequested)}
                          )
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Deposit balance info banner for customer */}
                {Boolean(order.depositAmount && order.depositAmount > 0) && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                      <FontAwesomeIcon icon={faReceipt} className="text-amber-500" />
                      <span>
                        {isRTL
                          ? `تم تسجيل عربون بقيمة ${formatPrice(order.depositAmount, currency, language)} لتأكيد حجز الطلب.`
                          : `A deposit of ${formatPrice(order.depositAmount, currency, language)} is registered for this order.`}
                      </span>
                    </div>
                    <div className="font-bold text-amber-900 dark:text-amber-100">
                      {translations[language].checkout.remainingOnDelivery}{' '}
                      <span className="font-mono font-black text-sm">
                        {formatPrice(order.remainingAmount || (order.totalAmount - (order.depositAmount || 0)), currency, language)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Items summary - Clickable Products */}
                <div className="divide-y theme-border text-xs">
                  {order.orderItems.map((item: any) => {
                    const itemImage = getImageUrl(item.product?.images);
                    const productUrl = getProductUrl(item.product);

                    return (
                      <div key={item.id} className="py-2.5 flex items-center justify-between gap-4">
                        <Link
                          href={productUrl}
                          className="flex items-center gap-3 group hover:opacity-90 transition flex-1 min-w-0"
                        >
                          <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 border theme-border flex-shrink-0 group-hover:ring-2 group-hover:ring-indigo-500 transition">
                            <Image
                              src={itemImage}
                              alt={item.product?.title || 'Product'}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-[var(--text-primary)] group-hover:text-indigo-600 transition-colors truncate block flex items-center gap-1">
                              <span>{item.product?.title}</span>
                              <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="text-[8px] opacity-0 group-hover:opacity-60 transition" />
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mt-0.5">
                              {item.colorName && (
                                <span>{isRTL ? 'اللون: ' : 'Color: '}{item.colorName}</span>
                              )}
                              <span>x {item.quantity}</span>
                            </div>
                          </div>
                        </Link>
                        <span className="font-mono font-bold text-[var(--text-primary)] flex-shrink-0">
                          {formatPrice(item.price * item.quantity, currency, language)}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t theme-border">
                  {/* Cancel Order Button */}
                  {canCancel && (
                    Boolean(order.depositAmount && order.depositAmount > 0 && order.depositStatus !== 'WAIVED') ? (
                      <button
                        type="button"
                        onClick={() =>
                          dialog.alert({
                            title: isRTL ? 'إلغاء الطلب' : 'Order Cancellation',
                            message: isRTL
                              ? 'هذا الطلب مسجل عليه عربون تأكيد حجز غير قابل للإلغاء التلقائي. إذا كنت بحاجة لإجراء تعديل أو إلغاء، يرجى التواصل مع فريق خدمة العملاء.'
                              : 'This order has a confirmed booking deposit and cannot be cancelled automatically. Please contact customer support for assistance.',
                            variant: 'warning',
                          })
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold transition"
                        title={isRTL ? 'طلب مسجل بعربون' : 'Deposit confirmed order'}
                      >
                        <FontAwesomeIcon icon={faLock} className="text-xs" />
                        <span>{t.depositOrderLock}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCancelOrder(order)}
                        disabled={cancellingOrderId === order.id}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 text-xs font-bold transition disabled:opacity-50"
                        title={isRTL ? 'إلغاء هذا الطلب واسترجاع المنتجات للمخزون' : 'Cancel this order and restore stock'}
                      >
                        {cancellingOrderId === order.id ? (
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />
                        ) : (
                          <FontAwesomeIcon icon={faBan} className="text-xs" />
                        )}
                        <span>{t.cancelOrder}</span>
                      </button>
                    )
                  )}

                  {/* Return Request Button — only for delivered orders */}
                  {isDelivered && (
                    hasActiveReturn ? (
                      <span className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-50 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 text-xs font-bold border border-orange-200 dark:border-orange-800">
                        <FontAwesomeIcon icon={faHourglassHalf} />
                        <span>{t.returnUnderReview}</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => setReturnOrder(order)}
                        id={`btn-return-${order.id}`}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 dark:hover:bg-orange-900/60 text-orange-600 dark:text-orange-400 text-xs font-bold transition"
                      >
                        <FontAwesomeIcon icon={faRotateLeft} />
                        <span>{t.requestReturn}</span>
                      </button>
                    )
                  )}

                  {/* Track Order link */}
                  <Link
                    href={`/order-tracking/${order.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border theme-border hover:bg-[var(--bg-card)] text-[var(--text-primary)] text-xs font-bold transition"
                  >
                    <FontAwesomeIcon icon={faTruckFast} className="text-indigo-500" />
                    <span>{t.trackOrder}</span>
                  </Link>

                  <button
                    onClick={() => setSelectedInvoiceOrder(order)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm shadow-indigo-600/20 transition"
                  >
                    <FontAwesomeIcon icon={faReceipt} />
                    <span>{t.viewInvoice}</span>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Load more button */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border theme-border text-xs font-bold text-[var(--text-primary)] transition disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loadingMore && <FontAwesomeIcon icon={faSpinner} spin className="text-xs" />}
                <span>{isRTL ? 'تحميل المزيد من الطلبات' : 'Load More Orders'}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Invoice modal */}
      {selectedInvoiceOrder && (
        <InvoiceModal
          isOpen={Boolean(selectedInvoiceOrder)}
          onClose={() => setSelectedInvoiceOrder(null)}
          order={selectedInvoiceOrder}
        />
      )}

      {/* Return Request Modal */}
      {returnOrder && (
        <ReturnRequestModal
          isOpen={Boolean(returnOrder)}
          onClose={() => setReturnOrder(null)}
          order={returnOrder}
          onSuccess={() => {
            setReturnOrder(null);
            fetchMyReturns();
          }}
        />
      )}
    </div>
  );
}
