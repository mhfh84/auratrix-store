'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/store/useSettingsStore';
import { useDialog } from '@/store/useDialogStore';
import { useToastStore } from '@/store/useToastStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicket,
  faPlus,
  faSearch,
  faEdit,
  faTrash,
  faSpinner,
  faCheck,
  faTimes,
  faCalendarAlt,
  faHashtag,
  faPercent,
  faCoins,
  faCopy,
  faFilter,
  faUsers,
  faGlobe,
  faFingerprint,
  faWandMagicSparkles,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import SkeletonTable from '@/components/SkeletonTable';

export interface PromoCodeItem {
  id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  description: string | null;
  minOrderAmount: number;
  maxUses: number | null;
  maxUsesPerUser: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminPromocodesClient() {
  const { language, currency, serverSettings } = useSettings();
  const t = (translations[language] as any).adminPromocodes || {};
  const isRTL = language === 'ar';
  const dialog = useDialog();

  const [promocodes, setPromocodes] = useState<PromoCodeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'DISABLED'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED',
    discountValue: '',
    description: '',
    minOrderAmount: '',
    maxUses: '',
    maxUsesPerUser: '',
    expiresAt: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Random Code Generator
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let rand = '';
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const cleanName = (serverSettings?.storeName || 'STORE').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'SAVE';
    const prefix = formData.discountType === 'PERCENTAGE' && formData.discountValue ? `OFF${Math.round(Number(formData.discountValue))}` : cleanName;
    const code = `${prefix}-${rand}`;
    setFormData((prev) => ({ ...prev, code }));
    useToastStore.getState().info(isRTL ? `تم توليد الكود: ${code}` : `Generated code: ${code}`);
  };

  // IP Usage modal state
  const [ipUsageModalCode, setIpUsageModalCode] = useState<string | null>(null);
  const [ipUsageRecords, setIpUsageRecords] = useState<any[]>([]);
  const [ipUsageLoading, setIpUsageLoading] = useState(false);

  const openIpUsageModal = async (code: string) => {
    setIpUsageModalCode(code);
    setIpUsageLoading(true);
    setIpUsageRecords([]);
    try {
      const res = await fetch(`/api/admin/promocodes/ip-usage?code=${encodeURIComponent(code)}`);
      if (res.ok) {
        const data = await res.json();
        setIpUsageRecords(data.records || []);
      }
    } catch {
      // Quietly ignore
    } finally {
      setIpUsageLoading(false);
    }
  };

  const fetchPromocodes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/promocodes');
      if (res.ok) {
        const data = await res.json();
        setPromocodes(data);
      } else {
        useToastStore.getState().error(isRTL ? 'ظپط´ظ„ طھط­ظ…ظٹظ„ ط£ظƒظˆط§ط¯ ط§ظ„ط®طµظ…' : 'Failed to fetch promo codes');
      }
    } catch (err) {
      useToastStore.getState().error(isRTL ? 'ط®ط·ط£ ظپظٹ ط§ظ„ط§طھطµط§ظ„ ط¨ط§ظ„ط®ط§ط¯ظ…' : 'Server connection error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromocodes();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      code: '',
      discountType: 'PERCENTAGE',
      discountValue: '',
      description: '',
      minOrderAmount: '0',
      maxUses: '',
      maxUsesPerUser: '',
      expiresAt: '',
      isActive: true,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const openEditModal = (promo: PromoCodeItem) => {
    setEditingId(promo.id);
    let formattedExpiry = '';
    if (promo.expiresAt) {
      const dateObj = new Date(promo.expiresAt);
      formattedExpiry = dateObj.toISOString().slice(0, 16);
    }

    setFormData({
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue.toString(),
      description: promo.description || '',
      minOrderAmount: promo.minOrderAmount ? promo.minOrderAmount.toString() : '0',
      maxUses: promo.maxUses !== null ? promo.maxUses.toString() : '',
      maxUsesPerUser: promo.maxUsesPerUser !== null ? promo.maxUsesPerUser.toString() : '',
      expiresAt: formattedExpiry,
      isActive: promo.isActive,
    });
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        code: formData.code.trim().toUpperCase(),
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        description: formData.description.trim(),
        minOrderAmount: parseFloat(formData.minOrderAmount) || 0,
        maxUses: formData.maxUses.trim() !== '' ? parseInt(formData.maxUses, 10) : null,
        maxUsesPerUser: formData.maxUsesPerUser.trim() !== '' ? parseInt(formData.maxUsesPerUser, 10) : null,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
        isActive: formData.isActive,
      };

      const url = editingId ? `/api/admin/promocodes/${editingId}` : '/api/admin/promocodes';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save promo code');
      }

      useToastStore.getState().success(
        editingId
          ? (isRTL ? 'طھظ… طھط­ط¯ظٹط« ظƒظˆط¯ ط§ظ„ط®طµظ… ط¨ظ†ط¬ط§ط­' : 'Promo code updated')
          : (isRTL ? 'طھظ… ط¥ظ†ط´ط§ط، ظƒظˆط¯ ط§ظ„ط®طµظ… ط¨ظ†ط¬ط§ط­' : 'Promo code created')
      );

      setIsModalOpen(false);
      fetchPromocodes();
    } catch (err: any) {
      const msg = err.message || 'An error occurred';
      setErrorMsg(msg);
      useToastStore.getState().error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await dialog.confirm({
      title: isRTL ? 'طھط£ظƒظٹط¯ ط­ط°ظپ ط§ظ„ظƒظˆط¯' : 'Confirm Delete Code',
      message: t.deleteConfirm || (isRTL ? 'ظ‡ظ„ ط£ظ†طھ ظ…طھط£ظƒط¯ ظ…ظ† ط±ط؛ط¨طھظƒ ظپظٹ ط­ط°ظپ ظ‡ط°ط§ ط§ظ„ظƒظˆط¯ ط§ظ„طھط±ظˆظٹط¬ظٹطں ظ„ط§ ظٹظ…ظƒظ† ط§ظ„طھط±ط§ط¬ط¹ ط¹ظ† ظ‡ط°ظ‡ ط§ظ„ط¹ظ…ظ„ظٹط©.' : 'Are you sure you want to delete this promo code? This action cannot be undone.'),
      confirmText: isRTL ? 'ط­ط°ظپ ط§ظ„ظƒظˆط¯' : 'Delete Code',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/promocodes/${id}`, { method: 'DELETE' });
      if (res.ok) {
        useToastStore.getState().success(isRTL ? 'طھظ… ط­ط°ظپ ط§ظ„ظƒظˆط¯ ط¨ظ†ط¬ط§ط­' : 'Promo code deleted successfully');
        fetchPromocodes();
      } else {
        const data = await res.json();
        useToastStore.getState().error(data.error || (isRTL ? 'ظپط´ظ„ ط­ط°ظپ ط§ظ„ظƒظˆط¯ ط§ظ„طھط±ظˆظٹط¬ظٹ' : 'Failed to delete promo code'));
      }
    } catch (err) {
      useToastStore.getState().error(isRTL ? 'ط®ط·ط£ ط£ط«ظ†ط§ط، ط­ط°ظپ ط§ظ„ظƒظˆط¯' : 'Error deleting promo code');
    }
  };

  const handleToggleActive = async (promo: PromoCodeItem) => {
    try {
      const res = await fetch(`/api/admin/promocodes/${promo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !promo.isActive }),
      });

      if (res.ok) {
        useToastStore.getState().success(
          !promo.isActive
            ? (isRTL ? 'طھظ… طھظپط¹ظٹظ„ ظƒظˆط¯ ط§ظ„ط®طµظ…' : 'Promo code activated')
            : (isRTL ? 'طھظ… طھط¹ط·ظٹظ„ ظƒظˆط¯ ط§ظ„ط®طµظ…' : 'Promo code disabled')
        );
        fetchPromocodes();
      }
    } catch (err) {
      useToastStore.getState().error(isRTL ? 'ظپط´ظ„ طھط؛ظٹظٹط± ط­ط§ظ„ط© ط§ظ„ظƒظˆط¯' : 'Failed to toggle status');
    }
  };

  const copyCodeToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Helper to determine code status label and badge
  const getPromoStatus = (promo: PromoCodeItem) => {
    if (!promo.isActive) {
      return { status: 'DISABLED', label: t.inactive || 'Disabled', color: 'bg-slate-500/10 text-slate-500 border-slate-500/20' };
    }
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return { status: 'EXPIRED', label: t.expiredDate || 'Expired (Date)', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      return { status: 'EXPIRED', label: t.expiredUses || 'Expired (Max Uses)', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20' };
    }
    return { status: 'ACTIVE', label: t.active || 'Active', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
  };

  // Filtered list
  const filteredPromocodes = promocodes.filter((promo) => {
    const matchesSearch =
      promo.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (promo.description && promo.description.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    const statusInfo = getPromoStatus(promo);
    if (statusFilter === 'ACTIVE' && statusInfo.status !== 'ACTIVE') return false;
    if (statusFilter === 'EXPIRED' && statusInfo.status !== 'EXPIRED') return false;
    if (statusFilter === 'DISABLED' && statusInfo.status !== 'DISABLED') return false;

    return true;
  });

  // Calculate Metrics
  const totalCodes = promocodes.length;
  const activeCodes = promocodes.filter((p) => getPromoStatus(p).status === 'ACTIVE').length;
  const totalUsesCount = promocodes.reduce((acc, p) => acc + p.usedCount, 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border theme-border shadow-sm">
        <div>
          <h1 className="text-base font-black text-[var(--text-primary)] flex items-center gap-2">
            <FontAwesomeIcon icon={faTicket} className="text-indigo-600" />
            <span>{t.title || 'Promo Codes & Coupon Management'}</span>
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {t.subtitle || 'Create & manage promotional discount codes with usage limits and expiration dates.'}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <FontAwesomeIcon icon={faPlus} />
          <span>{t.addNew || 'Create New Promo Code'}</span>
        </button>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <FontAwesomeIcon icon={faCheck} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border theme-border bg-[var(--bg-surface)] shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total Promo Codes</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">{totalCodes}</p>
        </div>
        <div className="p-4 rounded-2xl border theme-border bg-[var(--bg-surface)] shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Active & Ready</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeCodes}</p>
        </div>
        <div className="p-4 rounded-2xl border theme-border bg-[var(--bg-surface)] shadow-sm space-y-1">
          <p className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total Times Redeemed</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{totalUsesCount}</p>
        </div>
      </div>

      {/* Controls & Filters Bar */}
      <div className="glass-panel p-4 rounded-2xl border theme-border shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <FontAwesomeIcon icon={faSearch} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)]" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.search || 'Search code or description...'}
            className="w-full ps-9 pe-4 py-2 rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-surface)] border theme-border rounded-xl w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'ACTIVE', 'EXPIRED', 'DISABLED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition flex items-center gap-1 whitespace-nowrap ${
                statusFilter === filter
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {filter === 'ALL' && 'All'}
              {filter === 'ACTIVE' && (t.active || 'Active')}
              {filter === 'EXPIRED' && (t.expiredDate || 'Expired')}
              {filter === 'DISABLED' && (t.inactive || 'Disabled')}
            </button>
          ))}
        </div>
      </div>

      {/* Table Container */}
      <div className="glass-panel rounded-2xl border theme-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-4">
            <SkeletonTable rows={5} cols={8} />
          </div>
        ) : filteredPromocodes.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto text-xl">
              <FontAwesomeIcon icon={faTicket} />
            </div>
            <p className="text-xs font-bold text-[var(--text-primary)]">{t.noPromocodes || 'No promo codes found.'}</p>
          </div>
        ) : (
          <>
            {/* Mobile cards (< 768px) */}
            <div className="md:hidden divide-y theme-border">
              {filteredPromocodes.map((promo) => {
                const statusInfo = getPromoStatus(promo);
                return (
                  <div key={promo.id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">{promo.code}</span>
                        <button onClick={() => copyCodeToClipboard(promo.code)} className="p-1 text-[var(--text-secondary)] hover:text-indigo-600 transition cursor-pointer"><FontAwesomeIcon icon={copiedCode === promo.code ? faCheck : faCopy} className={copiedCode === promo.code ? 'text-emerald-500' : ''} /></button>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${statusInfo.color}`}>{statusInfo.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                        {promo.discountType === 'PERCENTAGE' ? `${promo.discountValue}% OFF` : `-${promo.discountValue} ${currency}`}
                      </span>
                      {promo.minOrderAmount > 0 && <span className="text-[var(--text-muted)]">{isRTL ? 'ط­ط¯ ط£ط¯ظ†ظ‰' : 'Min'}: {promo.minOrderAmount} {currency}</span>}
                      <span className="text-[var(--text-muted)]">{promo.usedCount}/{promo.maxUses ?? 'âˆ‍'} {isRTL ? 'ط§ط³طھط®ط¯ط§ظ…' : 'uses'}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-1 border-t theme-border">
                      <button onClick={() => handleToggleActive(promo)} className={`p-1.5 rounded-lg border theme-border transition cursor-pointer ${promo.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}><FontAwesomeIcon icon={promo.isActive ? faCheck : faTimes} className="text-xs" /></button>
                      <button onClick={() => openEditModal(promo)} className="p-1.5 rounded-lg border theme-border text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 transition cursor-pointer"><FontAwesomeIcon icon={faEdit} className="text-xs" /></button>
                      <button onClick={() => handleDelete(promo.id)} className="p-1.5 rounded-lg border theme-border text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer"><FontAwesomeIcon icon={faTrash} className="text-xs" /></button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-start text-xs border-collapse">
                <thead>
                  <tr className="border-b theme-border bg-[var(--bg-surface)] text-[var(--text-secondary)] font-extrabold uppercase text-[10px] tracking-wider">
                    <th className="p-4 text-start">{t.code || 'Code'}</th>
                    <th className="p-4 text-start">{t.type || 'Discount'}</th>
                    <th className="p-4 text-start">{t.minOrder || 'Min Order'}</th>
                    <th className="p-4 text-start">{t.uses || 'Redemptions'}</th>
                    <th className="p-4 text-start">{isRTL ? 'ط§ظ„ط­ط¯ ظ„ظƒظ„ ظ…ط³طھط®ط¯ظ…' : 'Per User'}</th>
                    <th className="p-4 text-start">IP Uses</th>
                    <th className="p-4 text-start">{t.expiry || 'Expiration'}</th>
                    <th className="p-4 text-start">{t.status || 'Status'}</th>
                    <th className="p-4 text-end">{t.actions || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y theme-border">
                  {filteredPromocodes.map((promo) => {
                    const statusInfo = getPromoStatus(promo);
                    const usagePercent =
                      promo.maxUses !== null && promo.maxUses > 0
                        ? Math.min(100, Math.round((promo.usedCount / promo.maxUses) * 100))
                        : 0;

                    let expiryLabel = t.noExpiry || 'No expiry';
                    let isNearExpiry = false;
                    if (promo.expiresAt) {
                      const diffMs = new Date(promo.expiresAt).getTime() - Date.now();
                      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                      if (diffDays < 0) {
                        expiryLabel = isRTL ? 'ظ…ظ†طھظ‡ظٹ ط§ظ„طµظ„ط§ط­ظٹط©' : 'Expired';
                      } else if (diffDays === 0) {
                        expiryLabel = isRTL ? 'ظٹظ†طھظ‡ظٹ ط§ظ„ظٹظˆظ…' : 'Expires today';
                        isNearExpiry = true;
                      } else if (diffDays === 1) {
                        expiryLabel = isRTL ? 'ظٹظ†طھظ‡ظٹ ط؛ط¯ط§ظ‹' : 'Expires tomorrow';
                        isNearExpiry = true;
                      } else {
                        expiryLabel = isRTL ? `ظ…طھط¨ظ‚ظٹ ${diffDays} ظٹظˆظ…` : `${diffDays} days left`;
                        if (diffDays <= 3) isNearExpiry = true;
                      }
                    }

                    return (
                      <tr key={promo.id} className="hover:bg-[var(--bg-card)] transition group">
                        {/* Code */}
                        <td className="p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono font-black text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                              {promo.code}
                            </span>
                            {promo.code === (serverSettings?.popupDiscountCode || 'WELCOME10') && (
                              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20 flex items-center gap-1">
                                <span>ًںژپ</span>
                                <span>{isRTL ? 'ظƒظˆط¯ ظ†ط§ظپط°ط© ط§ظ„طھط±ط­ظٹط¨' : 'Welcome Popup'}</span>
                              </span>
                            )}
                            <button
                              onClick={() => copyCodeToClipboard(promo.code)}
                              className="p-1 text-[var(--text-secondary)] hover:text-indigo-600 transition cursor-pointer"
                              title="Copy code"
                            >
                              <FontAwesomeIcon icon={copiedCode === promo.code ? faCheck : faCopy} className={copiedCode === promo.code ? 'text-emerald-500' : ''} />
                            </button>
                          </div>
                          {promo.description && (
                            <p className="text-[10px] text-[var(--text-secondary)] mt-1 truncate max-w-xs">{promo.description}</p>
                          )}
                        </td>

                        {/* Discount Value */}
                        <td className="p-4 font-bold text-[var(--text-primary)]">
                          {promo.discountType === 'PERCENTAGE' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-extrabold">
                              <FontAwesomeIcon icon={faPercent} className="text-[10px]" />
                              <span>{promo.discountValue}% OFF</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 font-extrabold">
                              <span>-{promo.discountValue} {currency}</span>
                            </span>
                          )}
                        </td>

                        {/* Min Order */}
                        <td className="p-4 text-[var(--text-secondary)] font-medium">
                          {promo.minOrderAmount > 0 ? `${promo.minOrderAmount} ${currency}` : '-'}
                        </td>

                        {/* Usage with progress bar */}
                        <td className="p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              <span className="font-bold text-[var(--text-primary)]">{promo.usedCount}</span>
                              <span className="text-[var(--text-secondary)] text-[10px]">
                                / {promo.maxUses !== null ? promo.maxUses : 'âˆ‍'}
                              </span>
                            </div>
                            {promo.maxUses !== null && promo.maxUses > 0 && (
                              <div className="w-20 h-1.5 rounded-full bg-[var(--bg-card)] overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${usagePercent >= 90 ? 'bg-red-500' : usagePercent >= 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${usagePercent}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Per User Limit */}
                        <td className="p-4 text-[var(--text-secondary)] font-medium">
                          {promo.maxUsesPerUser !== null ? (
                            <span className="inline-flex items-center gap-1 text-[11px]">
                              <FontAwesomeIcon icon={faFingerprint} className="text-[10px] text-[var(--text-muted)]" />
                              <span>{promo.maxUsesPerUser}أ—</span>
                            </span>
                          ) : (
                            <span className="text-[10px] opacity-60">âˆ‍</span>
                          )}
                        </td>

                        {/* IP Uses */}
                        <td className="p-4">
                          <button
                            onClick={() => openIpUsageModal(promo.code)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-[var(--bg-card)] border theme-border text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 transition cursor-pointer"
                          >
                            <FontAwesomeIcon icon={faGlobe} className="text-[9px]" />
                            <span>{isRTL ? 'ط§ظ„ط§ط³طھط®ط¯ط§ظ…' : 'Usage'}</span>
                          </button>
                        </td>

                        {/* Expiry */}
                        <td className="p-4 text-[var(--text-secondary)]">
                          {promo.expiresAt ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1 text-[11px]">
                                <FontAwesomeIcon icon={faCalendarAlt} className="text-[10px]" />
                                <span>{new Date(promo.expiresAt).toLocaleDateString()}</span>
                              </span>
                              <span className={`block text-[9px] font-extrabold ${isNearExpiry ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-muted)]'}`}>
                                {expiryLabel}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[10px] opacity-60">{t.noExpiry || 'No expiry'}</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold border ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            <button onClick={() => handleToggleActive(promo)} title={promo.isActive ? 'Disable' : 'Enable'} className={`p-1.5 rounded-lg border theme-border transition cursor-pointer ${promo.isActive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                              <FontAwesomeIcon icon={promo.isActive ? faCheck : faTimes} className="text-xs" />
                            </button>
                            <button onClick={() => openEditModal(promo)} title="Edit" className="p-1.5 rounded-lg border theme-border text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 transition cursor-pointer">
                              <FontAwesomeIcon icon={faEdit} className="text-xs" />
                            </button>
                            <button onClick={() => handleDelete(promo.id)} title="Delete" className="p-1.5 rounded-lg border theme-border text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition cursor-pointer">
                              <FontAwesomeIcon icon={faTrash} className="text-xs" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-surface)] border theme-border rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b theme-border pb-3">
              <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <FontAwesomeIcon icon={faTicket} className="text-indigo-600" />
                <span>{editingId ? (t.editTitle || 'Edit Promo Code') : (t.addTitle || 'Create New Promo Code')}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 transition cursor-pointer"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Promo Code Input + Generator Button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[var(--text-primary)]">{t.codeLabel || 'Promo Code *'}</label>
                  <button
                    type="button"
                    onClick={generateRandomCode}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 transition cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faWandMagicSparkles} />
                    <span>{isRTL ? 'طھظˆظ„ظٹط¯ ظƒظˆط¯ طھظ„ظ‚ط§ط¦ظٹ' : 'Generate Code'}</span>
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder={t.codePlaceholder || 'e.g. SUMMER20'}
                    className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none uppercase"
                  />
                </div>
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">{t.typeLabel || 'Discount Type *'}</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                    className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold"
                  >
                    <option value="PERCENTAGE">{t.percentage || 'Percentage (%)'}</option>
                    <option value="FIXED">{t.fixed || 'Fixed Amount'}</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">
                    {formData.discountType === 'PERCENTAGE' ? 'Discount (%) *' : `Discount Amount (${currency}) *`}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={formData.discountType === 'PERCENTAGE' ? '100' : undefined}
                    required
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    placeholder="20"
                    className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Min Order, Max Uses (Global), & Max Uses (Per User) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">{t.minOrderLabel || 'Min Order'}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    placeholder={t.minOrderPlaceholder || '0 for no min'}
                    className="w-full px-3 py-2 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">{t.maxUsesLabel || 'Max Uses Total'}</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUses}
                    onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                    placeholder={t.maxUsesPlaceholder || 'âˆ‍ Unlimited'}
                    className="w-full px-3 py-2 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-primary)]">{isRTL ? 'ط§ظ„ط­ط¯ ظ„ظƒظ„ ظ…ط³طھط®ط¯ظ…' : 'Uses Per User'}</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.maxUsesPerUser}
                    onChange={(e) => setFormData({ ...formData, maxUsesPerUser: e.target.value })}
                    placeholder="1"
                    className="w-full px-3 py-2 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">{t.expiryLabel || 'Expiration Date & Time'}</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <p className="text-[10px] text-[var(--text-secondary)]">{t.expiryNote || 'Leave empty for no expiration date limit.'}</p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">{t.descriptionLabel || 'Notes / Description'}</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder={t.descriptionPlaceholder || 'Optional description...'}
                  className="w-full px-4 py-2.5 rounded-xl border theme-border bg-[var(--bg-card)] text-[var(--text-primary)] text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Is Active Checkbox */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                />
                <label htmlFor="isActiveToggle" className="text-xs font-bold text-[var(--text-primary)] cursor-pointer">
                  {t.isActiveLabel || 'Activate code immediately'}
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border theme-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold transition"
                >
                  {t.cancel || 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
                >
                  {saving && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-xs" />}
                  <span>{saving ? (t.saving || 'Saving...') : (t.save || 'Save Code')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IP USAGE MODAL */}
      {ipUsageModalCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--bg-surface)] border theme-border rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-5 animate-scale-up max-h-[80vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b theme-border pb-3 flex-shrink-0">
              <h3 className="text-sm font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <FontAwesomeIcon icon={faUsers} className="text-indigo-600" />
                <span>IP Usage Tracking â€” </span>
                <span className="font-mono text-indigo-600">{ipUsageModalCode}</span>
              </h3>
              <button
                onClick={() => setIpUsageModalCode(null)}
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1 transition"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto">
              {ipUsageLoading ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)] flex items-center justify-center gap-2">
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin text-indigo-600" />
                  <span>Loading usage records...</span>
                </div>
              ) : ipUsageRecords.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)]">
                  <FontAwesomeIcon icon={faUsers} className="text-3xl mb-2 opacity-30" />
                  <p className="font-bold">No usage records yet for this code.</p>
                  <p className="mt-1 opacity-70">Records appear when users copy or apply this promo code.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium mb-3">
                    {ipUsageRecords.length} unique device{ipUsageRecords.length !== 1 ? 's' : ''} used this code
                  </p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b theme-border text-[var(--text-secondary)] text-[10px] font-extrabold uppercase tracking-wider">
                          <th className="p-3 text-start">
                            <span className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faGlobe} className="text-[10px]" />
                              IP Address
                            </span>
                          </th>
                          <th className="p-3 text-start">
                            <span className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faFingerprint} className="text-[10px]" />
                              Browser Fingerprint
                            </span>
                          </th>
                          <th className="p-3 text-start">
                            <span className="flex items-center gap-1">
                              <FontAwesomeIcon icon={faCalendarAlt} className="text-[10px]" />
                              Used At
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y theme-border">
                        {ipUsageRecords.map((record) => (
                          <tr key={record.id} className="hover:bg-[var(--bg-card)] transition">
                            <td className="p-3">
                              <span className="font-mono text-[11px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md">
                                {record.ip || 'â€”'}
                              </span>
                            </td>
                            <td className="p-3">
                              {record.fingerprintId ? (
                                <span className="font-mono text-[10px] text-[var(--text-secondary)] truncate max-w-[160px] block" title={record.fingerprintId}>
                                  {record.fingerprintId.substring(0, 16)}â€¦
                                </span>
                              ) : (
                                <span className="text-[10px] opacity-40">â€”</span>
                              )}
                            </td>
                            <td className="p-3 text-[var(--text-secondary)] text-[11px]">
                              {new Date(record.usedAt).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end border-t theme-border pt-3 flex-shrink-0">
              <button
                onClick={() => setIpUsageModalCode(null)}
                className="px-4 py-2 rounded-xl border theme-border text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-bold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
