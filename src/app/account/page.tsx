'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSettings } from '@/store/useSettingsStore';
import { useDialog } from '@/store/useDialogStore';
import { translations } from '@/lib/translations';
import { currencies, formatPrice } from '@/lib/currencies';
import { egyptGovernorates, getCitiesForGovernorate } from '@/lib/egyptLocations';
import { getPhoneError } from '@/lib/validation';
import PasswordStrengthBar from '@/components/PasswordStrengthBar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { UserData, AddressData, ReferralData } from '@/types/models';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import {
  faUser,
  faCoins,
  faClipboardList,
  faSave,
  faCheckCircle,
  faExclamationCircle,
  faLocationDot,
  faPhone,
  faEnvelope,
  faHeart,
  faPlus,
  faStar,
  faTrash,
  faEdit,
  faHouse,
  faBriefcase,
  faMapPin,
  faTimes,
  faCheck,
  faSpinner,
  faLink,
  faCopy,
  faGift,
  faUsers,
  faLock,
  faKey,
  faEye,
  faEyeSlash,
  faShieldHalved,
  faCalendarAlt,
  faUserShield,
  faShare,
} from '@fortawesome/free-solid-svg-icons';

const ADDRESS_TYPE_ICONS: Record<string, any> = {
  HOME: faHouse,
  WORK: faBriefcase,
  OTHER: faMapPin,
};

export default function AccountPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const dialog = useDialog();
  const { language, currency, serverSettings } = useSettings();
  const isRTL = language === 'ar';
  const t = translations[language].account;

  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change state
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Referral state
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '' });
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Addresses State
  const [addresses, setAddresses] = useState<AddressData[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [addressPhoneError, setAddressPhoneError] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<{
    title: string;
    addressType: string;
    recipientName: string;
    phone: string;
    state: string;
    city: string;
    streetAddress: string;
    isDefault: boolean;
  }>({
    title: t.home,
    addressType: 'HOME',
    recipientName: '',
    phone: '',
    state: '',
    city: '',
    streetAddress: '',
    isDefault: false,
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/account');
      return;
    }
    if (status === 'authenticated') {
      fetchAccount();
      fetchAddresses();
      fetchReferralData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const fetchAccount = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const res = await fetch('/api/account');
      if (res.ok) {
        const data = await res.json();
        setUserData(data.user as UserData);
        setForm({ name: data.user.name || '', phone: data.user.phone || '' });
      } else {
        setLoadError(isRTL ? 'تعذّر تحميل بيانات الحساب' : 'Failed to load account data');
      }
    } catch {
      setLoadError(isRTL ? 'خطأ في الخادم — حاول مجدداً' : 'Server error — please try again');
    } finally {
      setLoading(false);
    }
  }, [isRTL]);

  const fetchAddresses = useCallback(async () => {
    try {
      setLoadingAddresses(true);
      const res = await fetch('/api/account/addresses');
      if (res.ok) {
        const data = await res.json();
        const raw: AddressData[] = Array.isArray(data.addresses) ? data.addresses : [];
        let hasDefault = false;
        const sanitized = raw.map((addr) => {
          if (addr.isDefault) {
            if (!hasDefault) { hasDefault = true; return addr; }
            return { ...addr, isDefault: false };
          }
          return addr;
        });
        setAddresses(sanitized);
      }
    } catch {
      console.error('Failed to load addresses');
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  const fetchReferralData = useCallback(async () => {
    try {
      const res = await fetch('/api/referrals');
      if (res.ok) {
        const data = await res.json();
        setReferralData(data as ReferralData);
      }
    } catch {
      // non-critical
    }
  }, []);

  const handleCopyReferralLink = () => {
    if (referralData?.referralLink) {
      navigator.clipboard.writeText(referralData.referralLink).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      });
    }
  };

  const handleShareWhatsApp = () => {
    if (!referralData?.referralLink) return;
    const shareMsg = isRTL
      ? 'استخدم رابط الاحالة الخاص بي واحصل على خصم على اول طلب!\n' + referralData.referralLink
      : 'Use my referral link and get a discount on your first order!\n' + referralData.referralLink;
    window.open('https://wa.me/?text=' + encodeURIComponent(shareMsg), '_blank');
  };

  const handleNativeShare = async () => {
    if (!referralData?.referralLink) return;
    try {
      await navigator.share({ title: isRTL ? 'رابط الإحالة' : 'Referral Link', url: referralData.referralLink });
    } catch { /* user cancelled or unsupported */ }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);
    // Client-side phone validation
    if (form.phone) {
      const err = getPhoneError(form.phone, isRTL);
      if (err) { setPhoneError(err); return; }
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), phone: form.phone.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setUserData((prev: UserData | null) => prev ? { ...prev, ...data.user } : data.user as UserData);
        setMsg({ type: 'success', text: t.successUpdate });
      } else {
        setMsg({ type: 'error', text: t.profileUpdateFailed });
      }
    } catch {
      setMsg({ type: 'error', text: t.serverError });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg(null);

    if (!pwdForm.currentPassword) {
      setPwdMsg({ type: 'error', text: isRTL ? 'يرجى إدخال كلمة المرور الحالية' : 'Please enter your current password' });
      return;
    }

    if (pwdForm.newPassword.length < 8) {
      setPwdMsg({ type: 'error', text: isRTL ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters' });
      return;
    }

    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setPwdMsg({ type: 'error', text: t.passwordMismatch });
      return;
    }

    setPwdSaving(true);
    try {
      const res = await fetch('/api/account/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: pwdForm.currentPassword,
          newPassword: pwdForm.newPassword,
          confirmPassword: pwdForm.confirmPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isRTL ? 'فشل تغيير كلمة المرور' : 'Failed to change password'));
      }

      setPwdMsg({ type: 'success', text: t.passwordUpdatedSuccess });
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPwdMsg({ type: 'error', text: err.message || t.serverError });
    } finally {
      setPwdSaving(false);
    }
  };

  // Address Handlers
  const handleOpenAddAddress = () => {
    setEditingAddressId(null);
    setAddressForm({
      title: t.home,
      addressType: 'HOME',
      recipientName: userData?.name || '',
      phone: userData?.phone || '',
      state: userData?.state || '',
      city: userData?.city || '',
      streetAddress: '',
      isDefault: addresses.length === 0,
    });
    setAddressError('');
    setAddressPhoneError(null);
    setShowAddressModal(true);
  };

  const handleOpenEditAddress = (addr: AddressData) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      title: addr.title || t.home,
      addressType: addr.addressType || 'HOME',
      recipientName: addr.recipientName || '',
      phone: addr.phone || '',
      state: addr.state || '',
      city: addr.city || '',
      streetAddress: addr.streetAddress || '',
      isDefault: addr.isDefault,
    });
    setAddressError('');
    setAddressPhoneError(null);
    setShowAddressModal(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressPhoneError(null);
    if (!addressForm.phone || !addressForm.city || !addressForm.streetAddress) {
      setAddressError(t.fillRequiredAddress);
      return;
    }
    const phoneErr = getPhoneError(addressForm.phone, isRTL);
    if (phoneErr) { setAddressPhoneError(phoneErr); return; }

    setSavingAddress(true);
    setAddressError('');
    try {
      const url = editingAddressId ? `/api/account/addresses/${editingAddressId}` : '/api/account/addresses';
      const res = await fetch(url, {
        method: editingAddressId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || (editingAddressId ? 'Failed to update address' : 'Failed to create address'));
      }
      setShowAddressModal(false);
      fetchAddresses();
    } catch (err: any) {
      setAddressError(err.message || t.saveAddressFailed);
    } finally {
      setSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    const prevAddresses = [...addresses];
    // Optimistically update UI
    setAddresses((prev) =>
      prev.map((addr) => ({
        ...addr,
        isDefault: addr.id === id,
      }))
    );

    try {
      const res = await fetch(`/api/account/addresses/${id}`, {
        method: 'PATCH',
      });
      if (res.ok) {
        fetchAddresses();
      } else {
        setAddresses(prevAddresses);
      }
    } catch (err) {
      setAddresses(prevAddresses);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const ok = await dialog.confirm({
      title: t.deleteAddressTitle,
      message: t.deleteAddressMsg,
      confirmText: t.deleteBtn,
      variant: 'danger',
    });
    if (!ok) return;

    // Optimistic removal
    const prevAddresses = [...addresses];
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    try {
      const res = await fetch(`/api/account/addresses/${id}`, { method: 'DELETE' });
      if (!res.ok) setAddresses(prevAddresses);
    } catch {
      setAddresses(prevAddresses);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-pulse">
        <div className="h-28 rounded-3xl bg-[var(--bg-card)] border theme-border" />
        <div className="h-48 rounded-3xl bg-[var(--bg-card)] border theme-border" />
        <div className="h-64 rounded-3xl bg-[var(--bg-card)] border theme-border" />
        <div className="h-48 rounded-3xl bg-[var(--bg-card)] border theme-border" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-rose-500 font-bold text-sm">{loadError}</p>
          <button
            onClick={() => fetchAccount()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
          >
            {isRTL ? 'إعادة المحاولة' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b theme-border">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--text-primary)]">{t.title}</h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">{t.subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/account/orders"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition"
          >
            <FontAwesomeIcon icon={faClipboardList} />
            <span>{t.tabOrders}</span>
          </Link>
          <Link
            href="/wishlist"
            className="flex items-center gap-2 px-4 py-2 rounded-xl border theme-border hover:bg-[var(--bg-card)] text-[var(--text-primary)] font-bold text-xs transition"
          >
            <FontAwesomeIcon icon={faHeart} className="text-rose-500" />
            <span>{t.wishlistTitle}</span>
          </Link>
        </div>
      </div>

      {/* Loyalty Points Banner */}
      {(() => {
        const redemptionRate = serverSettings?.pointsRedemptionRate || 20.0;
        const loyaltyEnabled = serverSettings?.loyaltyEnabled ?? true;
        const currInfo = currencies[currency || serverSettings?.defaultCurrency || 'USD'] || currencies.USD;
        const currSymbol = isRTL ? currInfo.symbolAr : currInfo.symbol;
        const userPoints = userData?.loyaltyPoints || 0;
        const balanceDiscount = Math.round((userPoints / redemptionRate) * 100) / 100;

        return (
          <div className="glass-panel p-6 rounded-3xl border border-amber-300/40 dark:border-amber-700/50 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 text-white flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30 flex-shrink-0">
                <FontAwesomeIcon icon={faCoins} />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {t.loyaltyPoints}
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black text-[var(--text-primary)] font-mono">
                    {userPoints}
                  </span>
                  <span className="text-xs font-bold text-[var(--text-secondary)]">{t.pointsBalance}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)] mt-1">
                  {loyaltyEnabled ? (
                    <>
                      <span>
                        {isRTL
                          ? `كل ${redemptionRate} نقطة = خصم 1 ${currSymbol} عند الدفع!`
                          : `Every ${redemptionRate} points = ${currInfo.symbol}1 instant discount at checkout!`}
                      </span>
                      {userPoints > 0 && (
                        <span className="font-bold text-amber-600 dark:text-amber-400 ms-1.5 inline-block">
                          {isRTL
                            ? `(رصيدك يعادل خصم ${formatPrice(balanceDiscount, currency, language)})`
                            : `(Your balance equals ${formatPrice(balanceDiscount, currency, language)} discount)`}
                        </span>
                      )}
                    </>
                  ) : (
                    <span>{t.loyaltyPaused}</span>
                  )}
                </p>
              </div>
            </div>

            <Link
              href="/products"
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-white font-extrabold text-xs shadow-md shadow-amber-500/25 transition whitespace-nowrap"
            >
              {t.shopAndEarn}
            </Link>
          </div>
        );
      })()}

      {/* Referral Program Card */}
      {referralData && serverSettings?.referralEnabled !== false && (
        <div className="glass-panel p-6 rounded-3xl border border-purple-300/40 dark:border-purple-700/50 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-sky-500/10 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-purple-200/50 dark:border-purple-700/40">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center text-xl shadow-lg shadow-purple-500/30 flex-shrink-0">
                <FontAwesomeIcon icon={faGift} />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-[var(--text-primary)]">
                  {t.referralProgramTitle}
                </h2>
                <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">
                  {isRTL
                    ? `احصل على ${serverSettings?.referralReferrerPoints || 50} نقطة لكل صديق يشتري عبر رابطك`
                    : `Earn ${serverSettings?.referralReferrerPoints || 50} points for every friend who orders via your link`}
                </p>
              </div>
            </div>
            {/* Stats badges */}
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-base font-black text-purple-600 dark:text-purple-400">{referralData.totalReferred}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{t.invited}</p>
              </div>
              <div className="w-px h-8 bg-[var(--border-color)]" />
              <div className="text-center">
                <p className="text-base font-black text-emerald-600 dark:text-emerald-400">{referralData.totalConverted}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{t.converted}</p>
              </div>
              <div className="w-px h-8 bg-[var(--border-color)]" />
              <div className="text-center">
                <p className="text-base font-black text-amber-600 dark:text-amber-400">{referralData.totalPointsEarned}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{t.pointsUnit}</p>
              </div>
            </div>
          </div>

          {/* Referral Link copy box */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-[var(--text-primary)]">{t.yourReferralLink}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-0 bg-[var(--bg-surface)] border theme-border rounded-xl px-3 py-2.5 text-xs font-mono text-[var(--text-secondary)] truncate">
                {referralData.referralLink}
              </div>
              <button
                id="btn-copy-referral"
                onClick={handleCopyReferralLink}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  linkCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                }`}
              >
                <FontAwesomeIcon icon={linkCopied ? faCheckCircle : faCopy} />
                <span>{linkCopied ? t.copied : t.copyLink}</span>
              </button>
              {/* WhatsApp share */}
              <button
                id="btn-share-whatsapp"
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-500 text-white transition whitespace-nowrap"
              >
                <FontAwesomeIcon icon={faWhatsapp} />
                <span>{isRTL ? 'واتسآب' : 'WhatsApp'}</span>
              </button>
              {/* Native share (mobile / supported browsers) */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  id="btn-native-share"
                  onClick={handleNativeShare}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[var(--bg-card)] border theme-border hover:bg-[var(--bg-card-hover)] text-[var(--text-primary)] transition"
                >
                  <FontAwesomeIcon icon={faShare} />
                  <span>{isRTL ? 'مشاركة' : 'Share'}</span>
                </button>
              )}
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              {isRTL
                ? `رمز الإحالة: ${referralData.referralCode} — يحصل صديقك على خصم ${serverSettings?.referralRefereeDiscount || 10}% على أول طلب له`
                : `Code: ${referralData.referralCode} — Your friend gets ${serverSettings?.referralRefereeDiscount || 10}% off their first order`}
            </p>
          </div>

          {/* Friends list */}
          {referralData.friends && referralData.friends.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <FontAwesomeIcon icon={faUsers} className="text-indigo-500 text-[11px]" />
                {t.invitedFriends}
              </p>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {referralData.friends.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between text-[11px] bg-[var(--bg-card)] px-3 py-2 rounded-xl border theme-border">
                    <span className="font-medium text-[var(--text-primary)]">{f.referredUser?.name || 'User'}</span>
                    <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                      f.status === 'REWARDED'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                    }`}>
                      {f.status === 'REWARDED' ? t.rewarded : t.pendingStatus}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Saved Shipping Addresses Section */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border theme-border shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b theme-border">
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <FontAwesomeIcon icon={faLocationDot} className="text-indigo-600" />
              <span>{t.savedAddressesTitle}</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isRTL
                ? 'قم بحفظ عدة عناوين للشحن واضغط على أي عنوان لتعيينه كافتراضي تلقائياً'
                : 'Save multiple shipping addresses and click any address to set it as default'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddAddress}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 transition cursor-pointer self-start sm:self-auto"
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>{t.addNewAddressBtn}</span>
          </button>
        </div>

        {/* Address Cards Grid */}
        {loadingAddresses ? (
          <div className="py-8 flex justify-center text-indigo-600">
            <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" />
          </div>
        ) : addresses.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-2xl border border-dashed theme-border bg-[var(--bg-card)]">
            <FontAwesomeIcon icon={faMapPin} className="text-3xl text-[var(--text-muted)] mb-2" />
            <p className="text-xs font-bold text-[var(--text-primary)]">
              {t.noSavedAddresses}
            </p>
            <p className="text-[11px] text-[var(--text-secondary)] mt-1">
              {isRTL
                ? 'أضف عنوانك لتسريع عملية الشراء عند إتمام الطلب'
                : 'Add an address to speed up checkout on your future orders'}
            </p>
            <button
              type="button"
              onClick={handleOpenAddAddress}
              className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
            >
              {t.addAddressNow}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => {
              const isDefault = addr.isDefault;
              return (
                <div
                  key={addr.id}
                  role="button"
                  tabIndex={0}
                  aria-label={addr.title}
                  onClick={() => {
                    if (!isDefault) {
                      handleSetDefaultAddress(addr.id);
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isDefault) {
                      e.preventDefault();
                      handleSetDefaultAddress(addr.id);
                    }
                  }}
                  className={`relative p-5 rounded-2xl border-2 transition-all flex flex-col justify-between select-none cursor-pointer group ${
                    isDefault
                      ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-md ring-2 ring-indigo-500/20'
                      : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-md hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  <div>
                    {/* Top Bar with Title & Selection Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        {/* Radio selection circle */}
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isDefault
                              ? 'border-indigo-600 bg-indigo-600 text-white shadow-xs'
                              : 'border-[var(--text-muted)] bg-[var(--bg-card)] group-hover:border-indigo-500'
                          }`}
                        >
                          {isDefault && <FontAwesomeIcon icon={faCheck} className="text-[10px]" />}
                        </div>

                        <span className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs">
                          <FontAwesomeIcon
                            icon={ADDRESS_TYPE_ICONS[addr.addressType || 'HOME'] ?? faHouse}
                          />
                        </span>
                        <h3 className="font-extrabold text-sm text-[var(--text-primary)]">{addr.title}</h3>
                      </div>

                      {isDefault ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500 text-white shadow-xs">
                          <FontAwesomeIcon icon={faCheck} className="text-[9px]" />
                          <span>{t.defaultAddressBadge}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-[var(--text-muted)] group-hover:text-indigo-600 transition">
                          {t.setAsDefault}
                        </span>
                      )}
                    </div>

                    {/* Address Details */}
                    <div className="space-y-1 text-xs text-[var(--text-secondary)]">
                      {addr.recipientName && (
                        <p className="font-bold text-[var(--text-primary)]">{addr.recipientName}</p>
                      )}
                      <p className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">{addr.phone}</p>
                      <p className="font-medium text-[var(--text-primary)] mt-1 whitespace-pre-line leading-relaxed">
                        {addr.streetAddress}, {addr.city}{addr.state ? `, ${addr.state}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="flex items-center justify-end gap-2 pt-4 mt-3 border-t theme-border">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditAddress(addr);
                      }}
                      className="p-2 text-[var(--text-secondary)] hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faEdit} />
                      <span>{t.editBtn}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteAddress(addr.id);
                      }}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      <span>{t.deleteBtn}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Profile Details Card (Clean Profile Customization) */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border theme-border shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b theme-border">
          <div>
            <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
              <FontAwesomeIcon icon={faUser} className="text-indigo-600" />
              <span>{t.tabProfile}</span>
            </h2>
            <p className="text-xs text-[var(--text-secondary)] mt-0.5">
              {isRTL ? 'تخصيص وتعديل بيانات ملفك الشخصي ورقم التواصل' : 'Customize your profile information and contact number'}
            </p>
          </div>

          {/* Quick User Role / Metadata Badge */}
          {userData && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                <FontAwesomeIcon icon={userData.role === 'ADMIN' ? faUserShield : faUser} className="text-indigo-500 text-[10px]" />
                <span>{userData.role === 'ADMIN' ? (isRTL ? 'مدير المتجر' : 'Admin') : userData.role === 'MODERATOR' ? (isRTL ? 'مشرف' : 'Moderator') : (isRTL ? 'عميل مسجل' : 'Customer')}</span>
              </span>
              {userData.createdAt && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] font-medium">
                  <FontAwesomeIcon icon={faCalendarAlt} className="text-[10px]" />
                  <span>{new Date(userData.createdAt).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', year: 'numeric' })}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {msg && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-center gap-2 ${
              msg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
            }`}
          >
            <FontAwesomeIcon icon={msg.type === 'success' ? faCheckCircle : faExclamationCircle} />
            <span>{msg.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[var(--text-secondary)] mb-1.5">{t.fullName} *</label>
              <div className="relative">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-xl p-3 ps-9 border theme-border focus:outline-none focus:border-indigo-500"
                  required
                />
                <FontAwesomeIcon icon={faUser} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
              </div>
            </div>

            <div>
              <label className="block font-bold text-[var(--text-secondary)] mb-1.5 flex items-center justify-between">
                <span>{t.email}</span>
                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  <FontAwesomeIcon icon={faLock} className="text-[9px]" />
                  <span>{isRTL ? 'ثابت' : 'Fixed'}</span>
                </span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={userData?.email || ''}
                  disabled
                  className="w-full bg-[var(--bg-card)] text-[var(--text-muted)] text-sm rounded-xl p-3 ps-9 border theme-border cursor-not-allowed opacity-80"
                />
                <FontAwesomeIcon icon={faEnvelope} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[var(--text-secondary)] mb-1.5">{t.phone}</label>
              <div className="relative">
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => { setForm({ ...form, phone: e.target.value }); setPhoneError(null); }}
                  placeholder={isRTL ? '01X XXXX XXXX' : '+20 1X XXXX XXXX'}
                  className={`w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-xl p-3 ps-9 border focus:outline-none focus:border-indigo-500 font-mono ${
                    phoneError ? 'border-rose-500' : 'theme-border'
                  }`}
                />
                <FontAwesomeIcon icon={faPhone} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
              </div>
              {phoneError && (
                <p className="mt-1 text-[11px] text-rose-500 font-semibold">{phoneError}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition disabled:opacity-50 cursor-pointer"
            >
              {saving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faSave} />}
              <span>{saving ? t.saving : t.saveChanges}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security & Change Password Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border theme-border shadow-md space-y-6">
        <div className="pb-3 border-b theme-border">
          <h2 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
            <FontAwesomeIcon icon={faKey} className="text-indigo-600" />
            <span>{t.securityTitle}</span>
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {t.securitySubtitle}
          </p>
        </div>

        {pwdMsg && (
          <div
            className={`p-4 rounded-2xl text-xs flex items-center gap-2 ${
              pwdMsg.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300'
            }`}
          >
            <FontAwesomeIcon icon={pwdMsg.type === 'success' ? faCheckCircle : faExclamationCircle} />
            <span>{pwdMsg.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-bold text-[var(--text-secondary)] mb-1.5">{t.currentPassword} *</label>
              <div className="relative">
                <input
                  type={showCurrentPwd ? 'text' : 'password'}
                  required
                  value={pwdForm.currentPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })}
                  placeholder={t.currentPasswordPlaceholder}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-xl p-3 ps-9 pe-10 border theme-border focus:outline-none focus:border-indigo-500"
                />
                <FontAwesomeIcon icon={faLock} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
                <button
                  type="button"
                  onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                >
                  <FontAwesomeIcon icon={showCurrentPwd ? faEyeSlash : faEye} className="text-xs" />
                </button>
              </div>
            </div>

            <div>
              <label className="block font-bold text-[var(--text-secondary)] mb-1.5">{t.newPassword} *</label>
              <div className="relative">
                <input
                  type={showNewPwd ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={pwdForm.newPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })}
                  placeholder={t.newPasswordPlaceholder}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-xl p-3 ps-9 pe-10 border theme-border focus:outline-none focus:border-indigo-500"
                />
                <FontAwesomeIcon icon={faKey} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
                <button
                  type="button"
                  onClick={() => setShowNewPwd(!showNewPwd)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                >
                  <FontAwesomeIcon icon={showNewPwd ? faEyeSlash : faEye} className="text-xs" />
                </button>
              </div>
              {/* Password strength indicator */}
              <PasswordStrengthBar password={pwdForm.newPassword} isArabic={isRTL} />
            </div>

            <div>
              <label className="block font-bold text-[var(--text-secondary)] mb-1.5">{t.confirmNewPassword} *</label>
              <div className="relative">
                <input
                  type={showConfirmPwd ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={pwdForm.confirmPassword}
                  onChange={(e) => setPwdForm({ ...pwdForm, confirmPassword: e.target.value })}
                  placeholder={t.confirmNewPasswordPlaceholder}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-xl p-3 ps-9 pe-10 border theme-border focus:outline-none focus:border-indigo-500"
                />
                <FontAwesomeIcon icon={faCheckCircle} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition"
                >
                  <FontAwesomeIcon icon={showConfirmPwd ? faEyeSlash : faEye} className="text-xs" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={pwdSaving}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-extrabold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
            >
              {pwdSaving ? <FontAwesomeIcon icon={faSpinner} spin /> : <FontAwesomeIcon icon={faShieldHalved} />}
              <span>{pwdSaving ? t.updatingPassword : t.updatePasswordBtn}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Address Add / Edit Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-lg bg-[var(--bg-surface)] border theme-border rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b theme-border">
              <h3 className="text-base font-extrabold text-[var(--text-primary)] flex items-center gap-2">
                <FontAwesomeIcon icon={faLocationDot} className="text-indigo-600" />
                <span>
                  {editingAddressId
                    ? t.editAddressTitle : t.addNewAddressBtn}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddressModal(false)}
                className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {addressError && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2">
                <FontAwesomeIcon icon={faExclamationCircle} />
                <span>{addressError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="space-y-4 text-xs">

              {/* Address Label — Radio Buttons */}
              <div>
                <label className="block font-bold text-[var(--text-secondary)] mb-2">
                  {t.addressType}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: t.home,  icon: faHouse,     type: 'HOME' },
                    { label: t.work,  icon: faBriefcase, type: 'WORK' },
                    { label: t.other, icon: faMapPin,    type: 'OTHER' },
                  ].map(({ label, icon, type }) => {
                    const isActive = addressForm.addressType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAddressForm({ ...addressForm, title: label as string, addressType: type })}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs transition ${
                          isActive
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20'
                            : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-color)] hover:border-indigo-400 hover:text-indigo-600'
                        }`}
                      >
                        <FontAwesomeIcon icon={icon} />
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">
                    {t.recipientName}
                  </label>
                  <input
                    type="text"
                    value={addressForm.recipientName}
                    onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                    placeholder={t.recipientPlaceholder}
                    className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] text-xs rounded-xl p-3 border theme-border focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">
                    {translations[language].checkout.phone} *
                  </label>
                  <input
                    type="tel"
                    required
                    value={addressForm.phone}
                    onChange={(e) => { setAddressForm({ ...addressForm, phone: e.target.value }); setAddressPhoneError(null); }}
                    placeholder={isRTL ? '01X XXXX XXXX' : '+20 1X XXXX XXXX'}
                    className={`w-full bg-[var(--bg-card)] text-[var(--text-primary)] text-xs rounded-xl p-3 border focus:outline-none focus:border-indigo-500 font-mono ${
                      addressPhoneError ? 'border-rose-500' : 'theme-border'
                    }`}
                  />
                  {addressPhoneError && (
                    <p className="mt-1 text-[11px] text-rose-500 font-semibold">{addressPhoneError}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">
                    {translations[language].checkout.governorate}
                  </label>
                  <div className="relative">
                    <select
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value, city: '' })}
                      className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] text-xs rounded-xl p-3 ps-9 pe-4 border theme-border focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer"
                    >
                      <option value="">{translations[language].checkout.selectGovernorate}</option>
                      {egyptGovernorates.map((g) => (
                        <option key={g.ar} value={isRTL ? g.ar : g.en}>
                          {isRTL ? g.ar : g.en}
                        </option>
                      ))}
                    </select>
                    <FontAwesomeIcon icon={faLocationDot} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[10px] pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[var(--text-secondary)] mb-1">
                    {translations[language].checkout.cityArea} *
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      disabled={!addressForm.state}
                      className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] text-xs rounded-xl p-3 ps-9 pe-4 border theme-border focus:outline-none focus:border-indigo-500 appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="">
                        {!addressForm.state
                          ? (isRTL ? '— اختر المحافظة أولاً —' : '— Select governorate first —')
                          : (isRTL ? '— اختر المدينة / الحي —' : '— Select City / Area —')}
                      </option>
                      {addressForm.state && getCitiesForGovernorate(addressForm.state, isRTL ? 'ar' : 'en').map((c) => (
                        <option key={c.ar} value={isRTL ? c.ar : c.en}>
                          {isRTL ? c.ar : c.en}
                        </option>
                      ))}
                    </select>
                    <FontAwesomeIcon icon={faMapPin} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-[10px] pointer-events-none" />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-[var(--text-secondary)] mb-1">
                  {t.streetDetails} *
                </label>
                <textarea
                  required
                  rows={3}
                  value={addressForm.streetAddress}
                  onChange={(e) => setAddressForm({ ...addressForm, streetAddress: e.target.value })}
                  placeholder={t.streetPlaceholder}
                  className="w-full bg-[var(--bg-card)] text-[var(--text-primary)] text-xs rounded-xl p-3 border theme-border focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <span className="font-bold text-xs text-[var(--text-primary)]">
                    {t.setAsDefaultCheckbox}
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t theme-border">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2.5 rounded-xl border theme-border text-[var(--text-secondary)] hover:bg-[var(--bg-card)] font-bold transition"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-md transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {savingAddress && <FontAwesomeIcon icon={faSpinner} spin />}
                  <span>{editingAddressId ? t.updateAddressBtn : t.saveAddressBtn}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
