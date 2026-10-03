'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useSettings } from '@/store/useSettingsStore';
import { useDialog } from '@/store/useDialogStore';
import { useToastStore } from '@/store/useToastStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faUserSecret,
  faFileExcel,
  faTrash,
  faCheckSquare,
  faSquare,
  faPhone,
  faSpinner,
  faReceipt,
  faBolt,
  faCoins,
  faCreditCard,
  faMoneyBillWave,
  faTimes,
  faLock,
  faArrowRight,
  faArrowLeft,
  faSearch,
  faFilter,
  faCheck,
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import * as XLSX from 'xlsx';
import InvoiceModal from '@/components/InvoiceModal';
import SkeletonTable from '@/components/SkeletonTable';

interface Order {
  id: string;
  totalAmount: number;
  promoCode?: string | null;
  discountAmount?: number;
  pointsUsed?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  paymentProof?: string | null;
  depositAmount?: number;
  depositStatus?: string;
  remainingAmount?: number;
  trackingNumber?: string | null;
  estimatedDelivery?: string | null;
  status: string;
  createdAt: string;
  userId: string | null;
  guestInfo: string | null;
  user?: { name: string; email: string; phone?: string | null } | null;
  orderItems: Array<{ id: string; quantity: number; price: number; product: { id: string; title: string; images?: string } }>;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string; activeBg: string }> = {
  PENDING: {
    bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700/50 hover:bg-amber-100 dark:hover:bg-amber-900/60',
    text: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-600',
    activeBg: 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-500/30',
  },
  SHIPPED: {
    bg: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-700/50 hover:bg-sky-100 dark:hover:bg-sky-900/60',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-300 dark:border-sky-600',
    activeBg: 'bg-sky-600 text-white border-sky-700 shadow-sm shadow-sky-600/30',
  },
  DELIVERED: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-600',
    activeBg: 'bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-600/30',
  },
  CANCELLED: {
    bg: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-700/50 hover:bg-red-100 dark:hover:bg-red-900/60',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-300 dark:border-red-600',
    activeBg: 'bg-red-600 text-white border-red-700 shadow-sm shadow-red-600/30',
  },
};

const ALL_STATUSES = ['PENDING', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as const;

export default function AdminOrdersClient() {
  const { language, currency, serverSettings } = useSettings();
  const t = translations[language].adminOrders;
  const isRTL = language === 'ar';
  const dialog = useDialog();

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/orders');
      const data = await res.json();
      if (res.ok && Array.isArray(data)) {
        setOrders(data);
      } else {
        useToastStore.getState().error(isRTL ? 'تعذر جلب قائمة الطلبات' : 'Failed to fetch orders');
      }
    } catch (e) {
      useToastStore.getState().error(isRTL ? 'خطأ في الاتصال بالخادم' : 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter !== 'ALL' && order.status !== statusFilter) {
        return false;
      }

      // Search query filter
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const code = order.id.toLowerCase();
      const shortCode = order.id.slice(-8).toLowerCase();

      let guestInfoObj: any = null;
      try {
        if (order.guestInfo) {
          guestInfoObj = typeof order.guestInfo === 'string' ? JSON.parse(order.guestInfo) : order.guestInfo;
        }
      } catch (e) {}

      const buyerName = (guestInfoObj?.name || order.user?.name || '').toLowerCase();
      const buyerEmail = (guestInfoObj?.email || order.user?.email || '').toLowerCase();
      const buyerPhone = (guestInfoObj?.phone || (order.user as any)?.phone || '').toLowerCase();
      const tracking = (order.trackingNumber || '').toLowerCase();

      return (
        code.includes(q) ||
        shortCode.includes(q) ||
        buyerName.includes(q) ||
        buyerEmail.includes(q) ||
        buyerPhone.includes(q) ||
        tracking.includes(q)
      );
    });
  }, [orders, searchQuery, statusFilter]);

  // Selection Logic
  const isAllSelected = filteredOrders.length > 0 && selectedIds.length === filteredOrders.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Status change handler for single order
  const handleStatusChange = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        useToastStore.getState().success(isRTL ? 'تم تحديث حالة الطلب بنجاح' : 'Order status updated');
        fetchOrders();
      } else {
        useToastStore.getState().error(isRTL ? 'فشل تحديث حالة الطلب' : 'Failed to update order status');
      }
    } catch (err) {
      useToastStore.getState().error(isRTL ? 'خطأ أثناء تحديث الحالة' : 'Error updating status');
    }
  };

  // Single Delete Handler
  const handleSingleDelete = async (orderId: string) => {
    const ok = await dialog.confirm({
      title: isRTL ? 'تأكيد حذف الطلب' : 'Confirm Delete Order',
      message: t.deleteConfirm || (isRTL ? 'هل أنت متأكد من رغبتك في حذف هذا الطلب بشكل نهائي؟' : 'Are you sure you want to permanently delete this order?'),
      confirmText: isRTL ? 'حذف الطلب' : 'Delete Order',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        useToastStore.getState().success(isRTL ? 'تم حذف الطلب بنجاح' : 'Order deleted successfully');
        setSelectedIds((prev) => prev.filter((id) => id !== orderId));
        fetchOrders();
      } else {
        useToastStore.getState().error(isRTL ? 'تعذر حذف الطلب' : 'Failed to delete order');
      }
    } catch (err) {
      useToastStore.getState().error(isRTL ? 'خطأ أثناء حذف الطلب' : 'Error deleting order');
    }
  };

  // Mass Delete Handler
  const handleMassDelete = async () => {
    if (selectedIds.length === 0) return;
    const ok = await dialog.confirm({
      title: isRTL ? 'تأكيد الحذف الجماعي' : 'Confirm Bulk Delete',
      message: t.massDeleteConfirm || (isRTL ? `سيتم حذف ${selectedIds.length} طلبات بشكل نهائي. هل أنت متأكد؟` : `${selectedIds.length} orders will be permanently deleted. Are you sure?`),
      confirmText: isRTL ? `حذف ${selectedIds.length} طلبات` : `Delete ${selectedIds.length} Orders`,
      variant: 'danger',
    });
    if (!ok) return;
    
    setIsBulkProcessing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds }),
      });
      if (res.ok) {
        useToastStore.getState().success(isRTL ? `تم حذف ${selectedIds.length} طلبات بنجاح` : `Deleted ${selectedIds.length} orders`);
        setSelectedIds([]);
        fetchOrders();
      } else {
        useToastStore.getState().error(isRTL ? 'تعذر إتمام الحذف الجماعي' : 'Bulk delete failed');
      }
    } catch (err) {
      useToastStore.getState().error(isRTL ? 'خطأ أثناء الحذف الجماعي' : 'Error performing bulk delete');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Mass Status Change Handler
  const handleMassStatusChange = async (status: string) => {
    if (selectedIds.length === 0) return;
    setIsBulkProcessing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedIds, status }),
      });
      if (res.ok) {
        useToastStore.getState().success(isRTL ? `تم تحديث حالة ${selectedIds.length} طلبات` : `Updated ${selectedIds.length} orders status`);
        setSelectedIds([]);
        fetchOrders();
      } else {
        useToastStore.getState().error(isRTL ? 'فشل التحديث الجماعي للحالة' : 'Failed to update orders status');
      }
    } catch (err) {
      useToastStore.getState().error(isRTL ? 'خطأ أثناء التحديث الجماعي' : 'Error updating orders');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Helper for Payment Method Badge
  const getPaymentBadge = (method?: string, hasProof?: boolean) => {
    switch (method) {
      case 'INSTAPAY':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-800">
            <FontAwesomeIcon icon={faBolt} className="text-purple-500" />
            <span>InstaPay</span>
            {hasProof && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Proof attached" />}
          </span>
        );
      case 'FAWRY':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <FontAwesomeIcon icon={faCoins} className="text-amber-500" />
            <span>Fawry</span>
          </span>
        );
      case 'CARD':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
            <FontAwesomeIcon icon={faCreditCard} className="text-sky-500" />
            <span>Card</span>
          </span>
        );
      case 'COD':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <FontAwesomeIcon icon={faMoneyBillWave} className="text-emerald-500" />
            <span>COD</span>
          </span>
        );
    }
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    const targetOrders = selectedIds.length > 0
      ? orders.filter((o) => selectedIds.includes(o.id))
      : filteredOrders;

    if (targetOrders.length === 0) return;

    const rows = targetOrders.map((order) => {
      let guestInfoObj: any = null;
      try {
        if (order.guestInfo) guestInfoObj = typeof order.guestInfo === 'string' ? JSON.parse(order.guestInfo) : order.guestInfo;
      } catch (e) {}

      const buyerName = guestInfoObj?.name || order.user?.name || '—';
      const buyerEmail = guestInfoObj?.email || order.user?.email || '—';
      const buyerPhone = guestInfoObj?.phone || (order.user as any)?.phone || '—';
      const buyerGov = guestInfoObj?.state || (order.user as any)?.state || '—';
      const buyerCity = guestInfoObj?.city || (order.user as any)?.city || '—';
      const buyerStreet = guestInfoObj?.address || (order.user as any)?.address || '—';
      const fullAddrParts = [buyerStreet !== '—' ? buyerStreet : null, buyerCity !== '—' ? buyerCity : null, buyerGov !== '—' ? buyerGov : null].filter(Boolean);
      const fullAddress = fullAddrParts.length > 0 ? fullAddrParts.join(' - ') : (buyerStreet !== '—' ? buyerStreet : '—');
      const itemsSummary = order.orderItems
        .map((item) => `${item.product?.title || 'Product'} (x${item.quantity})`)
        .join(', ');

      return {
        'Order Code': `#${order.id.slice(-8).toUpperCase()}`,
        'Full Order ID': order.id,
        'Date': new Date(order.createdAt).toLocaleString(),
        'Customer Type': order.userId ? 'Registered User' : 'Guest',
        'Customer Name': buyerName,
        'Email': buyerEmail,
        'Phone Number': buyerPhone,
        'Governorate': buyerGov,
        'City / Area': buyerCity,
        'Street Address': buyerStreet,
        'Full Shipping Address': fullAddress,
        'Payment Method': order.paymentMethod || 'COD',
        'Payment Status': order.paymentStatus || 'PENDING',
        'Tracking Number': order.trackingNumber || '—',
        'Has Payment Proof': order.paymentProof ? 'Yes' : 'No',
        'Payment Proof URL': order.paymentProof || '—',
        'Total Amount': formatPrice(order.totalAmount, currency, language),
        'Raw Amount': order.totalAmount,
        'Status': t.statuses[order.status as keyof typeof t.statuses] || order.status,
        'Purchased Items': itemsSummary,
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Orders');
    const cleanStoreName = (serverSettings?.storeName || 'Store').replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(workbook, `${cleanStoreName}_Orders_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-[var(--text-primary)] tracking-tight">{t.title}</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {t.total} <span className="font-bold text-indigo-600">{orders.length}</span> {t.totalSuffix}
          </p>
        </div>

        {/* Excel Export Button */}
        <button
          onClick={handleExportExcel}
          disabled={orders.length === 0}
          className="inline-flex items-center justify-center gap-2.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer disabled:opacity-50"
        >
          <FontAwesomeIcon icon={faFileExcel} className="text-sm" />
          <span>
            {selectedIds.length > 0
              ? `${t.exportSelectedExcel} (${selectedIds.length})`
              : t.exportExcel}
          </span>
        </button>
      </div>

      {/* Stats Cards */}
      {orders.length > 0 && (() => {
        const totalRevenue = orders.filter((o) => o.status === 'DELIVERED').reduce((sum, o) => sum + o.totalAmount, 0);
        const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
        const shippedCount = orders.filter((o) => o.status === 'SHIPPED').length;
        const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;
        const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;

        const cards = [
          {
            label: isRTL ? 'إجمالي الطلبات' : 'Total Orders',
            value: orders.length,
            icon: faReceipt,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-950/50',
            border: 'border-indigo-200 dark:border-indigo-800/60',
            filter: 'ALL',
          },
          {
            label: isRTL ? 'إجمالي الإيرادات' : 'Total Revenue',
            value: formatPrice(totalRevenue, currency, language),
            icon: faMoneyBillWave,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/50',
            border: 'border-emerald-200 dark:border-emerald-800/60',
            filter: 'DELIVERED',
          },
          {
            label: isRTL ? 'قيد الانتظار' : 'Pending',
            value: pendingCount,
            icon: faSpinner,
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/50',
            border: 'border-amber-200 dark:border-amber-800/60',
            filter: 'PENDING',
          },
          {
            label: isRTL ? 'تم الشحن' : 'Shipped',
            value: shippedCount,
            icon: faBolt,
            color: 'text-sky-600 dark:text-sky-400',
            bg: 'bg-sky-50 dark:bg-sky-950/50',
            border: 'border-sky-200 dark:border-sky-800/60',
            filter: 'SHIPPED',
          },
          {
            label: isRTL ? 'تم التسليم' : 'Delivered',
            value: deliveredCount,
            icon: faCheck,
            color: 'text-green-600 dark:text-green-400',
            bg: 'bg-green-50 dark:bg-green-950/50',
            border: 'border-green-200 dark:border-green-800/60',
            filter: 'DELIVERED',
          },
          {
            label: isRTL ? 'ملغي' : 'Cancelled',
            value: cancelledCount,
            icon: faTimes,
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-50 dark:bg-red-950/50',
            border: 'border-red-200 dark:border-red-800/60',
            filter: 'CANCELLED',
          },
        ];

        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {cards.map((card) => {
              const isCardActive = statusFilter === card.filter && card.filter !== 'ALL';
              return (
                <div
                  key={card.label}
                  onClick={() => setStatusFilter(statusFilter === card.filter ? 'ALL' : card.filter)}
                  className={`glass-panel rounded-2xl border ${card.border} ${card.bg} p-4 flex flex-col gap-2 shadow-sm cursor-pointer transition hover:scale-[1.02] ${
                    isCardActive ? 'ring-2 ring-indigo-500' : ''
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${card.bg} border ${card.border}`}>
                    <FontAwesomeIcon icon={card.icon} className={`text-sm ${card.color}`} />
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{card.label}</p>
                  <p className={`text-lg font-black ${card.color} leading-none`}>{card.value}</p>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* Search & Filter Toolbar */}
      <div className="glass-panel p-3.5 rounded-2xl border theme-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <FontAwesomeIcon
            icon={faSearch}
            className={`absolute top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] ${
              isRTL ? 'right-3' : 'left-3'
            }`}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث برقم الطلب، اسم العميل، الهاتف...' : 'Search by order ID, name, phone...'}
            className={`w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl py-2 border theme-border focus:outline-none focus:border-indigo-500 ${
              isRTL ? 'pr-9 pl-3' : 'pl-9 pr-3'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] ${
                isRTL ? 'left-3' : 'right-3'
              }`}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          )}
        </div>

        {/* Status Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1 w-full sm:w-auto bg-[var(--bg-surface)] p-1 rounded-xl border theme-border overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`text-[11px] font-bold px-3 py-1 rounded-lg transition cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
            }`}
          >
            {isRTL ? 'الكل' : 'All'} ({orders.length})
          </button>
          {ALL_STATUSES.map((st) => {
            const count = orders.filter((o) => o.status === st).length;
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`text-[11px] font-bold px-3 py-1 rounded-lg transition cursor-pointer whitespace-nowrap ${
                  isActive
                    ? `${STATUS_COLORS[st].activeBg}`
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'
                }`}
              >
                <span>{t.statuses[st]}</span>
                <span className="ms-1 text-[10px] opacity-80">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="glass-panel p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/50 dark:bg-indigo-950/30 flex flex-wrap items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-2.5 text-xs font-bold text-indigo-700 dark:text-indigo-300">
            <span className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-black">
              {selectedIds.length}
            </span>
            <span>{t.selectedCount}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Bulk Status Selector */}
            <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] p-1 rounded-xl border theme-border overflow-x-auto">
              <span className="text-[11px] font-bold text-[var(--text-secondary)] px-2 whitespace-nowrap">
                {t.massChangeStatus}:
              </span>
              {ALL_STATUSES.map((statusKey) => (
                <button
                  key={statusKey}
                  disabled={isBulkProcessing}
                  onClick={() => handleMassStatusChange(statusKey)}
                  className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition border cursor-pointer whitespace-nowrap ${STATUS_COLORS[statusKey].bg}`}
                >
                  {t.statuses[statusKey]}
                </button>
              ))}
            </div>

            {/* Bulk Delete Button */}
            <button
              onClick={handleMassDelete}
              disabled={isBulkProcessing}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {isBulkProcessing ? (
                <FontAwesomeIcon icon={faSpinner} spin />
              ) : (
                <FontAwesomeIcon icon={faTrash} />
              )}
              <span>{t.massDelete}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Mobile Card List (< 768px) ── */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="py-12 flex justify-center"><div className="w-7 h-7 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : filteredOrders.length === 0 ? (
          <div className="glass-panel rounded-2xl border theme-border py-12 text-center text-xs text-[var(--text-muted)] font-semibold">
            {isRTL ? 'لم يتم العثور على طلبات مطابقة.' : 'No customer orders matching the criteria.'}
          </div>
        ) : (
          filteredOrders.map((order) => {
            let guestInfo: any = null;
            try {
              if (order.guestInfo) guestInfo = typeof order.guestInfo === 'string' ? JSON.parse(order.guestInfo) : order.guestInfo;
            } catch (e) {}

            const buyerName = guestInfo?.name || order.user?.name || '—';
            const buyerPhone = guestInfo?.phone || (order.user as any)?.phone || '';
            const isSelected = selectedIds.includes(order.id);

            return (
              <div key={order.id} className={`glass-card rounded-2xl border theme-border p-4 space-y-3 transition ${isSelected ? 'border-indigo-400 ring-1 ring-indigo-400/30' : ''}`}>
                {/* Card Top Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <button type="button" onClick={() => handleSelectOne(order.id)} className="text-indigo-600 hover:text-indigo-500 text-sm">
                      <FontAwesomeIcon icon={isSelected ? faCheckSquare : faSquare} className={isSelected ? 'text-indigo-600' : 'text-[var(--text-muted)]'} />
                    </button>
                    <div>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono font-black text-indigo-600 dark:text-indigo-400 hover:underline text-sm"
                      >
                        #{order.id.slice(-8).toUpperCase()}
                      </Link>
                      <p className="text-[10px] text-[var(--text-muted)]">{new Date(order.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-end">
                    <p className="font-black text-[var(--text-primary)] text-sm">{formatPrice(order.totalAmount, currency, language)}</p>
                    {getPaymentBadge(order.paymentMethod, Boolean(order.paymentProof))}
                  </div>
                </div>

                {/* Buyer & Instant WhatsApp/Call */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs bg-[var(--bg-surface)]/60 p-2.5 rounded-xl border theme-border">
                  <div className="flex items-center gap-2 min-w-0">
                    <FontAwesomeIcon icon={order.userId ? faUser : faUserSecret} className="text-indigo-500 flex-shrink-0" />
                    <span className="font-bold text-[var(--text-primary)] truncate">{buyerName}</span>
                  </div>
                  {buyerPhone && (
                    <div className="flex items-center gap-1.5 ms-auto">
                      <a
                        href={`tel:${buyerPhone}`}
                        className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-[11px] font-bold flex items-center gap-1 hover:bg-indigo-100 transition shadow-xs"
                        title={isRTL ? 'اتصال بالعميل' : 'Call Customer'}
                      >
                        <FontAwesomeIcon icon={faPhone} className="text-[10px]" />
                        <span>{isRTL ? 'اتصال' : 'Call'}</span>
                      </a>
                      <a
                        href={`https://wa.me/${buyerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                          isRTL
                            ? `مرحباً ${buyerName}، بخصوص طلبك رقم #${order.id.slice(-8).toUpperCase()} من متجر ${serverSettings?.storeName || 'المتجر'}.`
                            : `Hello ${buyerName}, regarding your order #${order.id.slice(-8).toUpperCase()} from ${serverSettings?.storeName || 'Store'}.`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold flex items-center gap-1 transition shadow-xs"
                        title={isRTL ? 'مراسلة عبر واتساب' : 'Chat on WhatsApp'}
                      >
                        <FontAwesomeIcon icon={faWhatsapp} className="text-xs" />
                        <span>WhatsApp</span>
                      </a>
                    </div>
                  )}
                </div>

                {/* Status — inline select on mobile */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{isRTL ? 'الحالة:' : 'Status:'}</span>
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    className={`flex-1 text-[11px] font-bold rounded-xl px-3 py-1.5 border transition focus:outline-none ${STATUS_COLORS[order.status]?.bg || 'bg-[var(--bg-surface)] border-[var(--border-color)]'}`}
                  >
                    {ALL_STATUSES.map((s) => (
                      <option key={s} value={s}>{t.statuses[s]}</option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-1 border-t theme-border">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 transition"
                  >
                    <span>{isRTL ? 'تفاصيل الطلب' : 'View Order'}</span>
                    <FontAwesomeIcon icon={isRTL ? faArrowLeft : faArrowRight} className="text-[10px]" />
                  </Link>
                  <button
                    onClick={() => { setSelectedInvoiceOrder(order); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-[var(--bg-surface)] border theme-border rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-indigo-600 transition"
                    title={language === 'ar' ? 'طباعة الفاتورة' : 'Print Invoice'}
                  >
                    <FontAwesomeIcon icon={faReceipt} className="text-[10px]" />
                  </button>
                  <button
                    onClick={() => handleSingleDelete(order.id)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl border border-red-200 dark:border-red-800/50 transition"
                  >
                    <FontAwesomeIcon icon={faTrash} className="text-xs" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Desktop Table (>= 768px) ── */}
      <div className="hidden md:block glass-panel rounded-2xl border theme-border overflow-x-auto shadow-sm">
        <table className="w-full text-xs text-start">
          <thead>
            <tr className="border-b theme-border bg-[var(--bg-surface)]">
              {/* Checkbox Header Column */}
              <th className="px-4 py-3.5 text-start w-10">
                <button
                  type="button"
                  onClick={handleSelectAll}
                  className="text-indigo-600 hover:text-indigo-500 text-sm focus:outline-none transition cursor-pointer"
                  title="Select All"
                >
                  <FontAwesomeIcon icon={isAllSelected ? faCheckSquare : faSquare} className={isAllSelected ? 'text-indigo-600' : 'text-[var(--text-muted)]'} />
                </button>
              </th>
              {[t.orderId, t.customerType, isRTL ? 'الدفع' : 'Payment', t.amount, t.status, t.details, t.actions].map((h) => (
                <th
                  key={h}
                  className="text-start px-4 py-3.5 text-[var(--text-secondary)] font-bold uppercase tracking-wider whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y theme-border">
            {loading ? (
              <tr>
                <td colSpan={7} className="p-4">
                  <SkeletonTable rows={5} cols={7} />
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-[var(--text-muted)] text-xs font-semibold">
                  {isRTL ? 'لم يتم العثور على طلبات مطابقة.' : 'No customer orders matching the criteria.'}
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => {
                let guestInfo: any = null;
                try {
                  if (order.guestInfo) guestInfo = typeof order.guestInfo === 'string' ? JSON.parse(order.guestInfo) : order.guestInfo;
                } catch (e) {}

                const isGuest = !order.userId;
                const buyerName = guestInfo?.name || order.user?.name || '—';
                const isSelected = selectedIds.includes(order.id);

                return (
                  <tr key={order.id} className={`transition hover:bg-[var(--bg-card)] ${isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''}`}>
                    {/* Checkbox Row Column */}
                    <td className="px-4 py-4">
                      <button
                        type="button"
                        onClick={() => handleSelectOne(order.id)}
                        className="text-indigo-600 hover:text-indigo-500 text-sm focus:outline-none transition cursor-pointer"
                      >
                        <FontAwesomeIcon
                          icon={isSelected ? faCheckSquare : faSquare}
                          className={isSelected ? 'text-indigo-600' : 'text-[var(--text-muted)]'}
                        />
                      </button>
                    </td>

                    {/* Order Code & Date */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-indigo-600 dark:text-indigo-400 font-black text-xs hover:underline inline-flex items-center gap-1"
                      >
                        #{order.id.slice(-8).toUpperCase()}
                      </Link>
                      <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </td>

                    {/* Customer Type & Name */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`p-2 rounded-xl flex items-center justify-center ${
                            isGuest
                              ? 'bg-sky-50 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-700/50'
                              : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700/50'
                          }`}
                        >
                          <FontAwesomeIcon icon={isGuest ? faUserSecret : faUser} />
                        </span>
                        <div>
                          <p
                            className={`font-bold text-[10px] uppercase tracking-wider ${
                              isGuest ? 'text-sky-600 dark:text-sky-400' : 'text-indigo-600 dark:text-indigo-400'
                            }`}
                          >
                            {isGuest ? t.guest : t.user}
                          </p>
                          <p className="font-bold text-[var(--text-primary)] text-xs">{buyerName}</p>
                        </div>
                      </div>
                    </td>

                    {/* Payment Method Badge & Deposit Status */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div>{getPaymentBadge(order.paymentMethod, Boolean(order.paymentProof))}</div>
                        <div className="flex flex-wrap items-center gap-1">
                          <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                            order.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                              : order.paymentStatus === 'FAILED'
                              ? 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300'
                              : order.paymentStatus === 'REFUNDED'
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                              : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                          }`}>
                            {order.paymentStatus || 'PENDING'}
                          </span>

                          {Boolean(order.depositAmount && order.depositAmount > 0) && (
                            <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-md ${
                              order.depositStatus === 'VERIFIED'
                                ? 'bg-emerald-500 text-white'
                                : order.depositStatus === 'WAIVED'
                                ? 'bg-slate-500 text-white'
                                : 'bg-amber-500 text-white'
                            }`}>
                              <FontAwesomeIcon icon={faLock} className="text-[8px]" />
                              <span>
                                {order.depositStatus === 'VERIFIED'
                                  ? (isRTL ? 'عربون مؤكد' : 'Deposit Verified')
                                  : order.depositStatus === 'WAIVED'
                                  ? (isRTL ? 'عربون معفى' : 'Deposit Waived')
                                  : (isRTL ? 'عربون معلق' : 'Deposit Pending')}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Amount & Balance Breakdown */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <p className="font-black text-[var(--text-primary)]">
                        {formatPrice(order.totalAmount, currency, language)}
                      </p>
                      {Boolean(order.depositAmount && order.depositAmount > 0) && (
                        <div className="text-[10px] space-y-0.5 mt-0.5">
                          <p className="text-amber-600 dark:text-amber-400 font-bold">
                            {isRTL ? 'العربون:' : 'Deposit:'} {formatPrice(order.depositAmount || 0, currency, language)}
                          </p>
                          <p className="text-[var(--text-secondary)] font-semibold">
                            {isRTL ? 'المتبقي:' : 'Balance:'} {formatPrice(order.remainingAmount || (order.totalAmount - (order.depositAmount || 0)), currency, language)}
                          </p>
                        </div>
                      )}
                    </td>

                    {/* Inline Status Options (Segmented Choice Buttons) */}
                    <td className="px-4 py-4">
                      <div className="inline-flex flex-wrap items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-xl border theme-border">
                        {ALL_STATUSES.map((statusKey) => {
                          const isActive = order.status === statusKey;
                          const colors = STATUS_COLORS[statusKey];

                          return (
                            <button
                              key={statusKey}
                              type="button"
                              onClick={() => handleStatusChange(order.id, statusKey)}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer whitespace-nowrap ${
                                isActive
                                  ? colors.activeBg
                                  : `bg-transparent border-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-card)] ${colors.text}`
                              }`}
                            >
                              {t.statuses[statusKey]}
                            </button>
                          );
                        })}
                      </div>
                    </td>

                    {/* Details Link Column */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-700/50 rounded-lg text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 font-bold text-xs transition cursor-pointer"
                      >
                        <span>{t.view}</span>
                        <FontAwesomeIcon icon={isRTL ? faArrowLeft : faArrowRight} className="text-[10px]" />
                      </Link>
                    </td>

                    {/* Row Action (Invoice Shortcut & Delete) */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedInvoiceOrder(order)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition cursor-pointer"
                          title={language === 'ar' ? 'طباعة الفاتورة' : 'Print Invoice'}
                        >
                          <FontAwesomeIcon icon={faReceipt} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSingleDelete(order.id)}
                          className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition cursor-pointer"
                          title={t.delete || 'Delete Order'}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Invoice Modal for Admin */}
      {selectedInvoiceOrder && (
        <InvoiceModal
          isOpen={Boolean(selectedInvoiceOrder)}
          onClose={() => setSelectedInvoiceOrder(null)}
          order={selectedInvoiceOrder as any}
        />
      )}
    </div>
  );
}
