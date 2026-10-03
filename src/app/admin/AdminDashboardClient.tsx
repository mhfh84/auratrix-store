'use client';

import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSettings } from '@/store/useSettingsStore';
import { useToastStore } from '@/store/useToastStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDollarSign, faShoppingCart, faExclamationTriangle, faBoxes,
  faArrowRight, faChartLine, faTrophy, faCalendarDays, faFilter,
  faFileExcel, faCoins, faWallet, faChartArea, faChartPie,
} from '@fortawesome/free-solid-svg-icons';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import * as XLSX from 'xlsx';

// ─── Types ────────────────────────────────────────────────────────────────────

interface OrderItemRaw {
  productId: string;
  quantity: number;
  price: number;
  product: { title: string; images: string };
}

interface OrderRaw {
  id: string;
  totalAmount: number;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string; // ISO string
  orderItems: OrderItemRaw[];
}

interface LowStockProduct {
  id: string;
  title: string;
  price: number;
  stockQuantity: number;
  category?: { name: string } | null;
}

interface AdminDashboardClientProps {
  allOrders: OrderRaw[];
  totalProducts: number;
  totalCategories?: number;
  lowStockProducts: LowStockProduct[];
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

type FilterRange = 'all' | 'today' | 'last7' | 'thisMonth' | 'custom';

function startOfDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function filterOrdersByRange(orders: OrderRaw[], range: FilterRange, from?: string, to?: string) {
  if (range === 'all') return orders;
  const now = new Date();

  if (range === 'today') {
    const start = startOfDay(now);
    return orders.filter((o) => new Date(o.createdAt) >= start);
  }
  if (range === 'last7') {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return orders.filter((o) => new Date(o.createdAt) >= startOfDay(start));
  }
  if (range === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return orders.filter((o) => new Date(o.createdAt) >= start);
  }
  if (range === 'custom' && from && to) {
    const start = new Date(from);
    start.setHours(0, 0, 0, 0);
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    return orders.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= start && d <= end;
    });
  }
  return orders;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminDashboardClient({
  allOrders,
  totalProducts,
  lowStockProducts,
}: AdminDashboardClientProps) {
  const { language, currency, serverSettings } = useSettings();
  const t = translations[language].adminDash;
  const isRTL = language === 'ar';

  // ── Date filter state ──
  const [activeRange, setActiveRange] = useState<FilterRange>('all');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [appliedCustomFrom, setAppliedCustomFrom] = useState('');
  const [appliedCustomTo, setAppliedCustomTo] = useState('');

  const applyCustomRange = useCallback(() => {
    if (customFrom && customTo) {
      setAppliedCustomFrom(customFrom);
      setAppliedCustomTo(customTo);
      setActiveRange('custom');
    }
  }, [customFrom, customTo]);

  // ── Derived metrics from filtered orders ──
  const filteredOrders = useMemo(() => {
    return filterOrdersByRange(allOrders, activeRange, appliedCustomFrom, appliedCustomTo);
  }, [allOrders, activeRange, appliedCustomFrom, appliedCustomTo]);

  const metrics = useMemo(() => {
    const delivered = filteredOrders.filter((o) =>
      ['DELIVERED', 'COMPLETED'].includes(o.status?.toUpperCase())
    );
    const totalRevenue = delivered.reduce((s, o) => s + o.totalAmount, 0);
    const totalOrders = filteredOrders.length;
    const lowStockCount = lowStockProducts.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / (delivered.length || 1) : 0;

    const statusCounts = {
      PENDING: filteredOrders.filter((o) => o.status === 'PENDING').length,
      PROCESSING: filteredOrders.filter((o) => o.status === 'PROCESSING').length,
      SHIPPED: filteredOrders.filter((o) => o.status === 'SHIPPED').length,
      DELIVERED: filteredOrders.filter((o) => o.status === 'DELIVERED').length,
      CANCELLED: filteredOrders.filter((o) => o.status === 'CANCELLED').length,
    };

    const validOrders = filteredOrders.filter((o) => o.status !== 'CANCELLED');
    const productSalesMap: Record<string, { title: string; count: number; revenue: number }> = {};
    validOrders.forEach((order) => {
      order.orderItems.forEach((item) => {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = { title: item.product?.title || 'Product', count: 0, revenue: 0 };
        }
        productSalesMap[item.productId].count += item.quantity;
        productSalesMap[item.productId].revenue += item.price * item.quantity;
      });
    });
    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return { totalRevenue, totalOrders, lowStockCount, avgOrderValue, statusCounts, topSellingProducts };
  }, [filteredOrders, lowStockProducts]);

  // Daily Chart Aggregation for Recharts
  const dailyChartData = useMemo(() => {
    const map: Record<string, { date: string; revenue: number; orders: number }> = {};
    const sorted = [...filteredOrders].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    sorted.forEach((order) => {
      const d = new Date(order.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        month: 'short',
        day: 'numeric',
      });
      if (!map[d]) {
        map[d] = { date: d, revenue: 0, orders: 0 };
      }
      map[d].orders += 1;
      if (['DELIVERED', 'COMPLETED', 'SHIPPED'].includes(order.status?.toUpperCase())) {
        map[d].revenue += order.totalAmount;
      }
    });

    return Object.values(map);
  }, [filteredOrders, language]);

  // Payment Status Distribution for Pie Chart
  const paymentChartData = useMemo(() => {
    const map: Record<string, number> = {
      PAID: 0,
      PENDING: 0,
      FAILED: 0,
      REFUNDED: 0,
    };
    filteredOrders.forEach((o) => {
      const ps = (o.paymentStatus || 'PENDING').toUpperCase();
      if (map[ps] !== undefined) map[ps] += 1;
      else map.PENDING += 1;
    });

    return [
      { name: isRTL ? 'مدفوع' : 'Paid', value: map.PAID, color: '#10b981' },
      { name: isRTL ? 'معلق' : 'Pending', value: map.PENDING, color: '#f59e0b' },
      { name: isRTL ? 'فاشل' : 'Failed', value: map.FAILED, color: '#ef4444' },
      { name: isRTL ? 'مسترجع' : 'Refunded', value: map.REFUNDED, color: '#8b5cf6' },
    ].filter((d) => d.value > 0);
  }, [filteredOrders, isRTL]);

  // Export Analytics to Excel
  const handleExportReport = () => {
    try {
      const rows = filteredOrders.map((o) => ({
        'Order ID': `#${o.id.slice(0, 8).toUpperCase()}`,
        'Date': new Date(o.createdAt).toLocaleString(),
        'Status': o.status,
        'Payment Method': o.paymentMethod || 'COD',
        'Payment Status': o.paymentStatus || 'PENDING',
        'Total Amount': o.totalAmount,
        'Items Count': o.orderItems?.length || 0,
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
      const cleanName = (serverSettings?.storeName || 'Store').replace(/[^a-zA-Z0-9]/g, '_');
      XLSX.writeFile(wb, `${cleanName}_Sales_${new Date().toISOString().slice(0, 10)}.xlsx`);
      useToastStore.getState().success(isRTL ? 'تم تصدير تقرير المبيعات بنجاح' : 'Sales report exported successfully');
    } catch (e) {
      useToastStore.getState().error(isRTL ? 'فشل تصدير التقرير' : 'Failed to export report');
    }
  };

  const colorMap: Record<string, string> = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-700/50',
    indigo: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 border-indigo-200 dark:border-indigo-700/50',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 border-amber-200 dark:border-amber-700/50',
    sky: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/80 border-sky-200 dark:border-sky-700/50',
    purple: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/80 border-purple-200 dark:border-purple-700/50',
  };

  const totalStatusCount = Object.values(metrics.statusCounts).reduce((a, b) => a + b, 0) || 1;

  const rangeButtons: { key: FilterRange; label: string }[] = [
    { key: 'all', label: t.filterAllTime },
    { key: 'today', label: t.filterToday },
    { key: 'last7', label: t.filterLast7 },
    { key: 'thisMonth', label: t.filterThisMonth },
    { key: 'custom', label: t.filterCustom },
  ];

  const metricCards = [
    { label: t.totalRevenue, value: formatPrice(metrics.totalRevenue, currency, language), desc: t.revenueDesc, icon: faDollarSign, color: 'emerald' },
    { label: t.totalOrders, value: metrics.totalOrders, desc: t.ordersDesc, icon: faShoppingCart, color: 'indigo' },
    { label: isRTL ? 'متوسط قيمة الطلب (AOV)' : 'Average Order Value', value: formatPrice(metrics.avgOrderValue, currency, language), desc: isRTL ? 'متوسط الإيراد لكل طلب ناجح' : 'Avg revenue per completed order', icon: faWallet, color: 'purple' },
    { label: t.lowStockWarning, value: metrics.lowStockCount, desc: t.lowStockDesc, icon: faExclamationTriangle, color: 'amber' },
  ];

  return (
    <div className="space-y-8">

      {/* ── Date Range Filter Bar + Export Button ── */}
      <div className="glass-card rounded-2xl border theme-border p-4 space-y-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2 text-xs font-extrabold text-[var(--text-primary)]">
            <FontAwesomeIcon icon={faCalendarDays} className="text-indigo-500" />
            <span>{t.filterLabel}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rangeButtons.map(({ key, label }) => (
              <button
                key={key}
                id={`admin-filter-${key}`}
                onClick={() => {
                  if (key !== 'custom') setActiveRange(key);
                  else setActiveRange('custom');
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  activeRange === key
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] border-[var(--border)] hover:text-indigo-600 hover:border-indigo-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Custom date inputs */}
          {activeRange === 'custom' && (
            <div className="flex flex-wrap items-end gap-3 pt-1">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{t.filterFrom}</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="text-xs bg-[var(--bg-surface)] border theme-border rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{t.filterTo}</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="text-xs bg-[var(--bg-surface)] border theme-border rounded-xl px-3 py-2 text-[var(--text-primary)] focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                id="admin-filter-apply-btn"
                onClick={applyCustomRange}
                disabled={!customFrom || !customTo}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold transition disabled:opacity-40 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <FontAwesomeIcon icon={faFilter} className="text-xs" />
                <span>{t.filterApply}</span>
              </button>
            </div>
          )}
        </div>

        {/* Excel Export Button */}
        <button
          onClick={handleExportReport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer self-start md:self-center"
        >
          <FontAwesomeIcon icon={faFileExcel} />
          <span>{isRTL ? 'تصدير تقرير Excel' : 'Export Excel Report'}</span>
        </button>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {metricCards.map((metric, i) => (
          <div key={i} className="glass-card p-5 rounded-2xl border theme-border space-y-3 shadow-sm hover:shadow-md transition">
            <div className="flex items-start justify-between">
              <div className={`p-2.5 rounded-xl border ${colorMap[metric.color]}`}>
                <FontAwesomeIcon icon={metric.icon} className="text-lg" />
              </div>
            </div>
            <div>
              <p className="text-xs text-[var(--text-secondary)] font-medium">{metric.label}</p>
              <p className="text-2xl font-black text-[var(--text-primary)] mt-0.5 font-mono">{metric.value}</p>
              <p className="text-[10px] text-[var(--text-muted)] mt-1">{metric.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Recharts Visual Sales Trend Chart ── */}
      <div className="glass-panel p-6 rounded-2xl border theme-border space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <FontAwesomeIcon icon={faChartArea} className="text-indigo-600 dark:text-indigo-400" />
              <span>{isRTL ? 'مخطط الإيرادات وحجم الطلبات الزمني' : 'Revenue & Order Trends'}</span>
            </h3>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isRTL ? 'رسم بياني تفاعلي يوضح وتيرة المبيعات والطلبات خلال الفترة المحددة' : 'Interactive timeline showing revenue and order volume'}
            </p>
          </div>
        </div>

        <div className="h-64 sm:h-72 w-full pt-2">
          {dailyChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-[var(--text-muted)]">
              {isRTL ? 'لا توجد بيانات مخطط زمني كافية في هذه الفترة' : 'No timeline data for selected period'}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.9)',
                    borderRadius: '12px',
                    borderColor: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="revenue" name={isRTL ? `الإيرادات (${currency})` : `Revenue (${currency})`} stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                <Area type="monotone" dataKey="orders" name={isRTL ? 'عدد الطلبات' : 'Orders Count'} stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorOrders)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Analytics & Distribution Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Status Distribution */}
        <div className="glass-panel p-6 rounded-2xl border theme-border space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <FontAwesomeIcon icon={faChartLine} className="text-indigo-500" />
              <span>{language === 'ar' ? 'توزيع حالات الطلبات' : 'Order Status Distribution'}</span>
            </h3>
            <Link href="/admin/orders" className="text-xs font-bold text-indigo-600 hover:underline">
              {language === 'ar' ? 'عرض الطلبات' : 'View Orders'}
            </Link>
          </div>

          <div className="space-y-3 pt-2 text-xs">
            {[
              { label: language === 'ar' ? 'تم التسليم' : 'Delivered', count: metrics.statusCounts.DELIVERED, color: 'bg-emerald-500', text: 'text-emerald-600' },
              { label: language === 'ar' ? 'تم الشحن' : 'Shipped', count: metrics.statusCounts.SHIPPED, color: 'bg-sky-500', text: 'text-sky-600' },
              { label: language === 'ar' ? 'جاري التجهيز' : 'Processing', count: metrics.statusCounts.PROCESSING, color: 'bg-indigo-500', text: 'text-indigo-600' },
              { label: language === 'ar' ? 'قيد الانتظار' : 'Pending', count: metrics.statusCounts.PENDING, color: 'bg-amber-500', text: 'text-amber-600' },
              { label: language === 'ar' ? 'ملغي' : 'Cancelled', count: metrics.statusCounts.CANCELLED, color: 'bg-rose-500', text: 'text-rose-600' },
            ].map((st, idx) => {
              const pct = Math.round((st.count / totalStatusCount) * 100);
              return (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between font-medium">
                    <span className="text-[var(--text-secondary)]">{st.label}</span>
                    <span className={`font-bold font-mono ${st.text}`}>
                      {st.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div className={`h-full ${st.color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Best-Selling Products */}
        <div className="glass-panel p-6 rounded-2xl border theme-border space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <FontAwesomeIcon icon={faTrophy} className="text-amber-500" />
              <span>{language === 'ar' ? 'أكثر المنتجات مبيعاً' : 'Top Selling Products'}</span>
            </h3>
            <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase">
              {language === 'ar' ? 'الترتيب حسب المبيعات' : 'By Units Sold'}
            </span>
          </div>

          {metrics.topSellingProducts.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              {language === 'ar' ? 'لا توجد بيانات مبيعات في هذه الفترة.' : 'No sales data for this period.'}
            </div>
          ) : (
            <div className="divide-y theme-border text-xs">
              {metrics.topSellingProducts.map((p, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[10px] ${
                      idx === 0 ? 'bg-amber-500 text-white' : idx === 1 ? 'bg-gray-300 dark:bg-gray-700 text-black dark:text-white' : 'bg-gray-100 dark:bg-gray-800 text-[var(--text-secondary)]'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="font-bold text-[var(--text-primary)] line-clamp-1">{p.title}</span>
                  </div>
                  <div className="text-end whitespace-nowrap">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono block">
                      {formatPrice(p.revenue, currency, language)}
                    </span>
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {p.count} {language === 'ar' ? 'وحدة' : 'units'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Low Stock Table ── */}
      <div className="glass-panel rounded-2xl border theme-border overflow-hidden shadow-sm">
        <div className="p-5 border-b theme-border flex justify-between items-center">
          <div>
            <h2 className="text-sm font-extrabold text-[var(--text-primary)]">{t.lowStockAlerts}</h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{t.lowStockSubtitle}</p>
          </div>
          <Link href="/admin/products" className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-500 transition">
            <span>{t.manageProducts}</span>
            <FontAwesomeIcon icon={faArrowRight} className={language === 'ar' ? 'rotate-180' : ''} />
          </Link>
        </div>

        {lowStockProducts.length === 0 ? (
          <div className="text-center py-12 text-xs text-[var(--text-secondary)]">{t.healthyStock}</div>
        ) : (
          <>
            {/* Mobile Cards (< 768px) */}
            <div className="md:hidden divide-y theme-border">
              {lowStockProducts.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[var(--text-primary)] truncate">{p.title}</p>
                    <p className="text-[11px] text-[var(--text-muted)] mt-0.5">{p.category?.name || t.unassigned}</p>
                    <p className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 mt-1">{formatPrice(p.price, currency, language)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300 font-extrabold text-[10px] px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-700/50">
                      {p.stockQuantity} {t.remaining}
                    </span>
                    <Link href={`/admin/products?edit=${p.id}`} className="text-xs font-bold text-indigo-600 hover:underline">
                      {t.replenish}
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b theme-border bg-[var(--bg-surface)]">
                    {[t.product, t.category, t.price, t.stockLevel, t.action].map((h) => (
                      <th key={h} className="text-start px-5 py-3 text-[var(--text-secondary)] font-bold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {lowStockProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--bg-card)] transition">
                      <td className="px-5 py-3.5 font-bold text-[var(--text-primary)]">{p.title}</td>
                      <td className="px-5 py-3.5 text-[var(--text-secondary)]">{p.category?.name || t.unassigned}</td>
                      <td className="px-5 py-3.5 text-[var(--text-primary)] font-medium font-mono">{formatPrice(p.price, currency, language)}</td>
                      <td className="px-5 py-3.5">
                        <span className="bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-300 font-bold px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-700/50">
                          {p.stockQuantity} {t.remaining}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/products?edit=${p.id}`} className="text-indigo-600 font-bold hover:underline">{t.replenish}</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
