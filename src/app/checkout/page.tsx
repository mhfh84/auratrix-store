'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart, useCartStore } from '@/store/useCartStore';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { formatPrice } from '@/lib/currencies';
import { getImageUrl } from '@/lib/images';
import { egyptGovernorates, getCitiesForGovernorate } from '@/lib/egyptLocations';
import Image from 'next/image';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser, faUserSecret, faCheckCircle, faShoppingBag,
  faLock, faExclamationCircle, faPhone, faMapMarkerAlt, faEnvelope,
  faCreditCard, faMoneyBillWave, faCoins, faShieldAlt, faUpload,
  faImage, faTrash, faSpinner, faHouse, faBriefcase, faPlus,
  faBolt, faCheck, faLocationDot, faMapPin, faWallet, faMobileScreen, faTruck,
} from '@fortawesome/free-solid-svg-icons';

interface SavedAddress {
  id: string;
  title: string;
  recipientName?: string | null;
  phone: string;
  state?: string | null;
  city: string;
  streetAddress: string;
  isDefault: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { items, guestInfo, getTotalAmount } = useCart();
  const { setGuestInfo, clearCart, validateCart } = useCartStore();
  const { language, currency, serverSettings } = useSettings();
  const isRTL = language === 'ar';
  const t = translations[language].checkout;
  const tPay = translations[language].payment;

  const [checkoutMode, setCheckoutMode] = useState<'guest' | 'user'>(session?.user ? 'user' : 'guest');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: session?.user?.name || guestInfo.name || '',
    email: session?.user?.email || guestInfo.email || '',
    phone: guestInfo.phone || '',
    state: guestInfo.state || '',
    city: guestInfo.city || '',
    address: guestInfo.address || '',
  });

  // Validate cart on checkout mount
  useEffect(() => {
    validateCart();
  }, [validateCart]);

  // Saved Addresses
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');
  const [saveNewAddress, setSaveNewAddress] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Payment method: COD, CARD, INSTAPAY, FAWRY, WALLETS
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'CARD' | 'INSTAPAY' | 'FAWRY' | 'WALLETS'>('COD');
  const [cardData, setCardData] = useState({
    number: '',
    holder: '',
    expiry: '',
    cvc: '',
  });

  // Instapay / Wallets / Deposit Proof Upload
  const [paymentProofUrl, setPaymentProofUrl] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [depositPolicyAgreed, setDepositPolicyAgreed] = useState(false);

  // Loyalty points
  const [userPoints, setUserPoints] = useState(0);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);

  // Promo Code State
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountType: string;
    discountValue: number;
    discountAmount: number;
  } | null>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Payment availability based on store settings
  const isCodEnabled = serverSettings?.paymentCodEnabled ?? true;
  const isInstapayEnabled = serverSettings?.paymentInstapayEnabled ?? true;
  const isFawryEnabled = serverSettings?.paymentFawryEnabled ?? true;
  const isCardEnabled = serverSettings?.paymentCardEnabled ?? true;
  const isWalletsEnabled = serverSettings?.paymentWalletsEnabled ?? false;

  useEffect(() => {
    const isCurrentEnabled =
      (paymentMethod === 'COD' && isCodEnabled) ||
      (paymentMethod === 'INSTAPAY' && isInstapayEnabled) ||
      (paymentMethod === 'FAWRY' && isFawryEnabled) ||
      (paymentMethod === 'CARD' && isCardEnabled) ||
      (paymentMethod === 'WALLETS' && isWalletsEnabled);

    if (!isCurrentEnabled) {
      if (isCodEnabled) setPaymentMethod('COD');
      else if (isInstapayEnabled) setPaymentMethod('INSTAPAY');
      else if (isCardEnabled) setPaymentMethod('CARD');
      else if (isFawryEnabled) setPaymentMethod('FAWRY');
      else if (isWalletsEnabled) setPaymentMethod('WALLETS');
    }
  }, [isCodEnabled, isInstapayEnabled, isFawryEnabled, isCardEnabled, isWalletsEnabled, paymentMethod]);

  // Fetch account info & saved addresses on auth
  useEffect(() => {
    if (session?.user) {
      // Fetch Account User Details
      fetch('/api/account')
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUserPoints(data.user.loyaltyPoints || 0);
            setFormData((prev) => ({
              ...prev,
              name: prev.name || data.user.name || session.user?.name || '',
              email: prev.email || data.user.email || session.user?.email || '',
              phone: prev.phone || data.user.phone || '',
              state: prev.state || data.user.state || '',
              city: prev.city || data.user.city || '',
              address: prev.address || data.user.address || '',
            }));
          }
        })
        .catch(() => {});

      // Fetch Saved Addresses
      setLoadingAddresses(true);
      fetch('/api/account/addresses')
        .then((res) => res.json())
        .then((data) => {
          const addrs: SavedAddress[] = Array.isArray(data.addresses) ? data.addresses : [];
          setSavedAddresses(addrs);

          if (addrs.length > 0) {
            const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
            setSelectedAddressId(defaultAddr.id);
            setFormData((prev) => ({
              ...prev,
              name: defaultAddr.recipientName || session.user?.name || prev.name,
              phone: defaultAddr.phone || prev.phone,
              state: defaultAddr.state || prev.state,
              city: defaultAddr.city || prev.city,
              address: defaultAddr.streetAddress || prev.address,
            }));
          }
        })
        .catch(() => {})
        .finally(() => setLoadingAddresses(false));
    }
  }, [session]);

  const handleSelectAddress = (addrId: string | 'new') => {
    setSelectedAddressId(addrId);
    if (addrId === 'new') {
      setFormData((prev) => ({
        ...prev,
        phone: '',
        state: '',
        city: '',
        address: '',
      }));
    } else {
      const selected = savedAddresses.find((a) => a.id === addrId);
      if (selected) {
        setFormData((prev) => ({
          ...prev,
          name: selected.recipientName || session?.user?.name || prev.name,
          phone: selected.phone,
          state: selected.state || '',
          city: selected.city,
          address: selected.streetAddress,
        }));
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setGuestInfo({ [name]: value });
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 16);
    val = val.replace(/(\d{4})/g, '$1 ').trim();
    setCardData({ ...cardData, number: val });
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
      val = `${val.substring(0, 2)}/${val.substring(2, 4)}`;
    }
    setCardData({ ...cardData, expiry: val });
  };

  // Proof screenshot upload handler
  const handleProofFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setUploadError(t.fileTooLarge);
      return;
    }

    setUploadingProof(true);
    setUploadError('');

    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Failed to upload screenshot');
      }

      setPaymentProofUrl(data.url);
    } catch (err: any) {
      setUploadError(err.message || t.uploadFailed);
    } finally {
      setUploadingProof(false);
    }
  };

  // Helper to get/create browser fingerprint ID
  const getFingerprintId = () => {
    try {
      const key = 'auratrix_fp_id';
      let fp = localStorage.getItem(key);
      if (!fp) {
        fp = (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36));
        localStorage.setItem(key, fp);
      }
      return fp;
    } catch { return ''; }
  };

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoInput.trim()) return;

    setPromoLoading(true);
    setPromoError('');

    try {
      const res = await fetch('/api/promocodes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: promoInput.trim(),
          cartTotal: getTotalAmount(),
          fingerprintId: getFingerprintId(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.valid) {
        throw new Error(data.error || 'Invalid promo code');
      }

      setAppliedPromo({
        code: data.code,
        discountType: data.discountType,
        discountValue: data.discountValue,
        discountAmount: data.discountAmount,
      });
      setPromoError('');
    } catch (err: any) {
      setPromoError(err.message || 'Failed to apply promo code');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError('');
  };

  const pointsRedemptionRate = serverSettings?.pointsRedemptionRate || 20.0;
  const subtotalAmount = getTotalAmount();
  const promoDiscount = appliedPromo ? appliedPromo.discountAmount : 0;
  const pointsDiscount = Math.round((pointsToRedeem / pointsRedemptionRate) * 100) / 100;
  const totalDiscounts = promoDiscount + pointsDiscount;
  const shippingFee = (serverSettings?.shippingFee && serverSettings.shippingFee > 0) ? serverSettings.shippingFee : 0;
  const codExtraFee = (paymentMethod === 'COD' && serverSettings?.paymentCodExtraFee && serverSettings.paymentCodExtraFee > 0) ? serverSettings.paymentCodExtraFee : 0;
  const finalTotalAmount = Math.max(0, Math.round((subtotalAmount - totalDiscounts + shippingFee + codExtraFee) * 100) / 100);

  // Deposit Calculation
  const isDepositEnabled = Boolean(serverSettings?.depositEnabled);
  const isDepositApplicable =
    isDepositEnabled &&
    (serverSettings?.depositAppliesTo === 'ALL' || paymentMethod === 'COD') &&
    (!serverSettings?.depositMinOrderTotal || finalTotalAmount >= (serverSettings.depositMinOrderTotal || 0));

  let depositAmount = 0;
  if (isDepositApplicable && finalTotalAmount > 0) {
    if (serverSettings?.depositType === 'PERCENTAGE') {
      depositAmount = Math.min(finalTotalAmount, Math.round((finalTotalAmount * (serverSettings.depositValue || 20)) / 100));
    } else if (serverSettings?.depositType === 'SHIPPING_ONLY') {
      depositAmount = Math.min(finalTotalAmount, serverSettings?.shippingFee || 50);
    } else {
      // FIXED
      depositAmount = Math.min(finalTotalAmount, serverSettings?.depositValue || 50);
    }
  }
  const remainingAmount = Math.max(0, Math.round((finalTotalAmount - depositAmount) * 100) / 100);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (items.length === 0) { setError(t.emptyCart); return; }

    const trimmedName = (formData.name || session?.user?.name || '').trim();
    const trimmedPhone = (formData.phone || '').trim();
    const trimmedAddress = (formData.address || '').trim();
    const trimmedGov = (formData.state || '').trim();
    const trimmedCity = (formData.city || '').trim();

    if (!trimmedName || !trimmedPhone || !trimmedAddress) {
      setError(
        isRTL
          ? 'يرجى إدخال الاسم بالكامل، رقم الهاتف، وتفاصيل العنوان للمتابعة'
          : 'Please provide full name, phone number, and street address.'
      );
      return;
    }

    if (paymentMethod === 'CARD') {
      if (!cardData.number || cardData.number.replace(/\s/g, '').length < 15 || !cardData.expiry || !cardData.cvc) {
        setError(t.invalidCardDetails);
        return;
      }
    }

    if (paymentMethod === 'INSTAPAY') {
      if (!paymentProofUrl) {
        setError(t.attachInstapayProof);
        return;
      }
    }

    if (paymentMethod === 'WALLETS') {
      if (!paymentProofUrl) {
        setError(
          isRTL
            ? 'يرجى إرفاق صورة/لقطة شاشة إيصال التحويل عبر المحفظة الإلكترونية لإتمام الطلب'
            : 'Please attach a screenshot of your mobile wallet transfer receipt.'
        );
        return;
      }
    }

    // Required Order Deposit & Anti-Cancellation Policy Validation
    if (isDepositApplicable && depositAmount > 0) {
      if (!paymentProofUrl) {
        setError(
          t.depositReceiptRequiredError ||
            (isRTL
              ? 'يرجى إرفاق صورة/لقطة شاشة إيصال تحويل العربون لتأكيد حجز الطلب'
              : 'Please attach your deposit payment receipt screenshot to confirm your order reservation.')
        );
        return;
      }
      if (!depositPolicyAgreed) {
        setError(
          t.depositPolicyRequiredError ||
            (isRTL
              ? 'يرجى الموافقة على شروط حجز الطلب ودفع العربون وسياسة عدم الإلغاء للمتابعة'
              : 'Please agree to the deposit terms and anti-cancellation policy to proceed.')
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const isNewAddress = session?.user && (selectedAddressId === 'new' || savedAddresses.length === 0);
      const newAddressToSave = (isNewAddress && saveNewAddress) ? {
        title: t.homeTitle,
        recipientName: trimmedName,
        phone: trimmedPhone,
        state: trimmedGov || null,
        city: trimmedCity || '',
        streetAddress: trimmedAddress,
        isDefault: savedAddresses.length === 0,
      } : null;

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((i) => ({ id: i.id, quantity: i.quantity, variantId: i.variantId || null, selectedColor: i.selectedColor || null })),
          guestInfo: {
            name: trimmedName,
            email: (formData.email || session?.user?.email || '').trim(),
            phone: trimmedPhone,
            state: trimmedGov,
            city: trimmedCity,
            address: trimmedAddress,
          },
          promoCode: appliedPromo ? appliedPromo.code : null,
          paymentMethod: paymentMethod,
          paymentProof: paymentProofUrl || null,
          depositAmount: depositAmount,
          remainingAmount: remainingAmount,
          pointsToRedeem: pointsToRedeem,
          fingerprintId: getFingerprintId(),
          newAddressToSave: newAddressToSave,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to process order.');
      clearCart();
      // Instant browser redirection to order confirmation page
      window.location.href = `/order-success/${data.id}`;
    } catch (err: any) {
      setError(err.message || 'An error occurred during checkout.');
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="glass-panel max-w-md mx-auto p-12 rounded-3xl space-y-4 border theme-border shadow-sm">
          <FontAwesomeIcon icon={faShoppingBag} className="text-5xl text-[var(--text-muted)]" />
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t.emptyCart}</h2>
          <p className="text-xs text-[var(--text-secondary)]">{t.emptyCartDesc}</p>
          <Link href="/products" className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg transition">{t.exploreCatalog}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">{t.title}</h1>
        <p className="text-xs text-[var(--text-secondary)] mt-1">{t.subtitle}</p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/80 border border-red-300 dark:border-red-700/60 p-4 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-200 text-xs animate-shake">
          <FontAwesomeIcon icon={faExclamationCircle} className="text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

        {/* Form Column */}
        <div className="lg:col-span-7 space-y-6">

          {/* Mode Switcher */}
          {!session?.user && (
            <div className="bg-[var(--bg-surface)] border theme-border p-1.5 rounded-2xl flex gap-2">
              {(['guest', 'user'] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => setCheckoutMode(mode)}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${checkoutMode === mode ? 'bg-indigo-600 text-white shadow-md' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                >
                  <FontAwesomeIcon icon={mode === 'guest' ? faUserSecret : faUser} />
                  <span>{mode === 'guest' ? t.guestMode : t.userMode}</span>
                </button>
              ))}
            </div>
          )}

          {/* Info Box */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border theme-border space-y-6 shadow-sm">
            {session?.user ? (
              <div className="bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-700/50 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white">
                    {session.user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)]">{t.loggedInAs} {session.user.name}</h3>
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-300">{session.user.email}</p>
                  </div>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1">
                  <FontAwesomeIcon icon={faCheckCircle} /><span>{t.verified}</span>
                </span>
              </div>
            ) : checkoutMode === 'user' ? (
              <div className="bg-[var(--bg-card)] border theme-border p-6 rounded-2xl text-center space-y-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">{t.signInPrompt}</h3>
                <p className="text-xs text-[var(--text-secondary)]">{t.signInDesc}</p>
                <Link href="/login?callbackUrl=/checkout" className="inline-block px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition">{t.signIn}</Link>
                <div className="pt-2">
                  <button onClick={() => setCheckoutMode('guest')} className="text-xs text-indigo-600 underline font-medium">{t.continueAsGuest}</button>
                </div>
              </div>
            ) : null}

            <form onSubmit={handlePlaceOrder} className="space-y-6">

              {/* Delivery info & Saved Address Selection */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-indigo-500" />
                  <span>{t.deliveryTitle}</span>
                </h2>

                {/* Saved Address Cards for Logged-in Users */}
                {session?.user && savedAddresses.length > 0 && (
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-[var(--text-secondary)]">
                      {t.selectSavedAddress}
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {savedAddresses.map((addr) => {
                        const isSelected = selectedAddressId === addr.id;
                        return (
                          <div
                            key={addr.id}
                            onClick={() => handleSelectAddress(addr.id)}
                            className={`p-3.5 rounded-2xl border-2 cursor-pointer transition flex flex-col justify-between ${
                              isSelected
                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm ring-1 ring-indigo-500/30'
                                : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-indigo-300'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-bold text-xs text-[var(--text-primary)] flex items-center gap-1.5">
                                <FontAwesomeIcon icon={(addr.title?.toLowerCase().includes('work') || addr.title?.toLowerCase().includes('office') || addr.title?.includes('\u0639\u0645\u0644')) ? faBriefcase : faHouse} className="text-indigo-500 text-xs" />
                                <span>{addr.title}</span>
                              </span>
                              {addr.isDefault && (
                                <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                                  {t.defaultBadge}
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-[var(--text-primary)] line-clamp-2 leading-relaxed">
                              {addr.streetAddress}, {addr.city}{addr.state ? `, ${addr.state}` : ''}
                            </p>
                            <p className="text-[10px] font-mono text-[var(--text-secondary)] mt-1.5">
                              {addr.phone}
                            </p>
                          </div>
                        );
                      })}

                      {/* Option to Add / Use New Address */}
                      <div
                        onClick={() => handleSelectAddress('new')}
                        className={`p-3.5 rounded-2xl border-2 border-dashed cursor-pointer transition flex flex-col items-center justify-center text-center gap-1.5 ${
                          selectedAddressId === 'new'
                            ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40'
                            : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-indigo-400'
                        }`}
                      >
                        <FontAwesomeIcon icon={faPlus} className="text-indigo-600 text-sm" />
                        <span className="text-xs font-bold text-[var(--text-primary)]">
                          {t.useNewAddress}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Saved Address Lock Status Banner */}
                {session?.user && selectedAddressId !== 'new' && savedAddresses.length > 0 && (
                  <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-medium">
                      <FontAwesomeIcon icon={faLock} className="text-indigo-500 flex-shrink-0" />
                      <span>
                        {isRTL
                          ? 'يتم استخدام بيانات العنوان المحفوظ المختار (لإدخال عنوان جديد، اختر "إضافة / استخدام عنوان جديد" أعلاه)'
                          : 'Using details from the selected saved address (To enter a different address, select "Add / Use New Address" above)'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Form fields (read-only if saved address selected, fully editable if new address or guest) */}
                {(() => {
                  const isLocked = Boolean(session?.user && selectedAddressId !== 'new' && savedAddresses.length > 0);
                  const inputDisabledClass = isLocked
                    ? 'bg-gray-100/90 dark:bg-gray-800/70 text-[var(--text-primary)] cursor-not-allowed border-dashed opacity-90 select-none'
                    : 'bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500';

                  return (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center justify-between">
                            <span>{t.fullName}</span>
                            {isLocked && <FontAwesomeIcon icon={faLock} className="text-[10px] text-indigo-500" />}
                          </label>
                          <input
                            type="text"
                            name="name"
                            required
                            disabled={isLocked}
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={t.namePlaceholder}
                            className={`w-full text-xs rounded-xl px-4 py-3 border theme-border ${inputDisabledClass}`}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t.email}</label>
                          <div className="relative">
                            <input
                              type="email"
                              name="email"
                              disabled={Boolean(session?.user)}
                              value={formData.email}
                              onChange={handleChange}
                              placeholder={t.emailPlaceholder}
                              className={`w-full text-xs rounded-xl ps-10 pe-4 py-3 border theme-border ${
                                session?.user
                                  ? 'bg-gray-100/90 dark:bg-gray-800/70 text-[var(--text-primary)] cursor-not-allowed opacity-90'
                                  : 'bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500'
                              }`}
                            />
                            <FontAwesomeIcon icon={faEnvelope} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center justify-between">
                            <span>{t.phone}</span>
                            {isLocked && <FontAwesomeIcon icon={faLock} className="text-[10px] text-indigo-500" />}
                          </label>
                          <div className="relative">
                            <input
                              type="tel"
                              name="phone"
                              required
                              disabled={isLocked}
                              value={formData.phone}
                              onChange={handleChange}
                              placeholder={t.phonePlaceholder}
                              className={`w-full text-xs rounded-xl ps-10 pe-4 py-3 border theme-border font-mono ${inputDisabledClass}`}
                            />
                            <FontAwesomeIcon icon={faPhone} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center justify-between">
                            <span>{t.governorate}</span>
                            {isLocked && <FontAwesomeIcon icon={faLock} className="text-[10px] text-indigo-500" />}
                          </label>
                          <div className="relative">
                            <select
                              value={formData.state}
                              disabled={isLocked}
                              onChange={(e) => {
                                const st = e.target.value;
                                setFormData((prev) => ({ ...prev, state: st, city: '' }));
                                setGuestInfo({ state: st, city: '' });
                              }}
                              className={`w-full text-xs rounded-xl ps-10 pe-4 py-3 border theme-border appearance-none ${
                                isLocked ? inputDisabledClass : 'bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 cursor-pointer'
                              }`}
                            >
                              <option value="">{t.selectGovernorate}</option>
                              {egyptGovernorates.map((g) => (
                                <option key={g.ar} value={isRTL ? g.ar : g.en}>{isRTL ? g.ar : g.en}</option>
                              ))}
                            </select>
                            <FontAwesomeIcon icon={faLocationDot} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center justify-between">
                          <span>{t.cityArea}</span>
                          {isLocked && <FontAwesomeIcon icon={faLock} className="text-[10px] text-indigo-500" />}
                        </label>
                        <div className="relative">
                          <select
                            value={formData.city}
                            onChange={(e) => {
                              const ct = e.target.value;
                              setFormData((prev) => ({ ...prev, city: ct }));
                              setGuestInfo({ city: ct });
                            }}
                            disabled={isLocked || !formData.state}
                            className={`w-full text-xs rounded-xl ps-10 pe-4 py-3 border theme-border appearance-none ${
                              isLocked
                                ? inputDisabledClass
                                : 'bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:border-indigo-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed'
                            }`}
                          >
                            <option value="">
                              {!formData.state ? t.selectGovFirst : t.selectCity}
                            </option>
                            {formData.state && getCitiesForGovernorate(formData.state, isRTL ? 'ar' : 'en').map((c) => (
                              <option key={c.ar} value={isRTL ? c.ar : c.en}>{isRTL ? c.ar : c.en}</option>
                            ))}
                          </select>
                          <FontAwesomeIcon icon={faMapPin} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs pointer-events-none" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1 flex items-center justify-between">
                          <span>{t.address}</span>
                          {isLocked && <FontAwesomeIcon icon={faLock} className="text-[10px] text-indigo-500" />}
                        </label>
                        <textarea
                          name="address"
                          required
                          rows={3}
                          disabled={isLocked}
                          value={formData.address}
                          onChange={handleChange}
                          placeholder={t.addressPlaceholder}
                          className={`w-full text-xs rounded-xl p-4 border theme-border ${inputDisabledClass}`}
                        />
                      </div>

                      {/* Auto-save to address book checkbox for registered users on new address */}
                      {session?.user && (selectedAddressId === 'new' || savedAddresses.length === 0) && (
                        <div className="pt-1">
                          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[var(--text-primary)] font-semibold">
                            <input
                              type="checkbox"
                              checked={saveNewAddress}
                              onChange={(e) => setSaveNewAddress(e.target.checked)}
                              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                            />
                            <span>{t.autoSaveAddress}</span>
                          </label>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* Payment Methods */}
              <div className="space-y-4 pt-4 border-t theme-border">
                <h2 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2">
                  <FontAwesomeIcon icon={faCreditCard} className="text-indigo-500" />
                  <span>{tPay.title}</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* COD Option */}
                  {isCodEnabled && (
                    <div
                      onClick={() => setPaymentMethod('COD')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                        paymentMethod === 'COD'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                          : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-indigo-300'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-indigo-600 flex items-center justify-center mt-0.5 flex-shrink-0">
                        {paymentMethod === 'COD' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faMoneyBillWave} className="text-emerald-500" />
                          <span>{tPay.cod}</span>
                          {Boolean(serverSettings?.paymentCodExtraFee && serverSettings.paymentCodExtraFee > 0) && (
                            <span className="text-[9px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold">
                              +{formatPrice(serverSettings?.paymentCodExtraFee || 0, currency, language)}
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                          {serverSettings?.paymentCodInstructions || tPay.codDesc}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Instapay Option */}
                  {isInstapayEnabled && (
                    <div
                      onClick={() => setPaymentMethod('INSTAPAY')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                        paymentMethod === 'INSTAPAY'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                          : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-indigo-300'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-indigo-600 flex items-center justify-center mt-0.5 flex-shrink-0">
                        {paymentMethod === 'INSTAPAY' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faBolt} className="text-purple-500" />
                          <span>{t.instapayTitle}</span>
                          <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 px-1.5 py-0.2 rounded-md font-bold">
                            {t.instantTransfer}
                          </span>
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                          {t.instapayDesc}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mobile Wallets Option */}
                  {isWalletsEnabled && (
                    <div
                      onClick={() => setPaymentMethod('WALLETS')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                        paymentMethod === 'WALLETS'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                          : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-indigo-300'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-indigo-600 flex items-center justify-center mt-0.5 flex-shrink-0">
                        {paymentMethod === 'WALLETS' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faMobileScreen} className="text-rose-500" />
                          <span>{t.walletsTitle}</span>
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                          {t.walletsDesc}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Fawry Option */}
                  {isFawryEnabled && (
                    <div
                      onClick={() => setPaymentMethod('FAWRY')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                        paymentMethod === 'FAWRY'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                          : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-indigo-300'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-indigo-600 flex items-center justify-center mt-0.5 flex-shrink-0">
                        {paymentMethod === 'FAWRY' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faCoins} className="text-amber-500" />
                          <span>{t.fawryTitle}</span>
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">
                          serverSettings?.paymentFawryInstructions || t.fawryDesc
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Card Option */}
                  {isCardEnabled && (
                    <div
                      onClick={() => setPaymentMethod('CARD')}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition flex items-start gap-3 ${
                        paymentMethod === 'CARD'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/40 shadow-sm'
                          : 'border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-indigo-300'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full border-2 border-indigo-600 flex items-center justify-center mt-0.5 flex-shrink-0">
                        {paymentMethod === 'CARD' && <div className="w-2.5 h-2.5 rounded-full bg-indigo-600" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faShieldAlt} className="text-indigo-500" />
                          <span>{tPay.card}</span>
                        </p>
                        <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 leading-snug">{serverSettings?.paymentCardInstructions || tPay.cardDesc}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instapay Screenshot Upload Section */}
                {paymentMethod === 'INSTAPAY' && isInstapayEnabled && (
                  <div className="p-5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/50 space-y-4 animate-fadeIn text-xs">
                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-purple-900 dark:text-purple-200 flex items-center gap-2">
                        <FontAwesomeIcon icon={faBolt} className="text-purple-600" />
                        <span>{t.instapayInstructions}</span>
                      </h4>
                      <div className="p-3 bg-[var(--bg-surface)] rounded-xl border theme-border text-[11px] space-y-1.5">
                        <p className="font-bold text-[var(--text-primary)]">
                          t.instapayIpa{' '}
                          <span className="font-mono text-purple-600 select-all font-black">
                            {serverSettings?.paymentInstapayAddress || 'auratrix@instapay'}
                          </span>
                        </p>
                        {Boolean(serverSettings?.paymentInstapayPhone) && (
                          <p className="text-[var(--text-secondary)]">
                            <span className="font-bold text-[var(--text-primary)]">{t.accountPhone}</span>{' '}
                            <span className="font-mono text-purple-600 select-all font-bold">{serverSettings?.paymentInstapayPhone}</span>
                          </p>
                        )}
                        <p className="text-[var(--text-secondary)]">
                          {`${t.amountToTransfer} ${formatPrice(finalTotalAmount, currency, language)}`}
                        </p>
                        {Boolean(serverSettings?.paymentInstapayInstructions) && (
                          <p className="text-[10px] text-[var(--text-muted)] border-t theme-border pt-1">
                            {serverSettings?.paymentInstapayInstructions}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Screenshot Upload UI */}
                    <div className="space-y-2">
                      <label className="block font-extrabold text-[var(--text-primary)]">
                        {t.attachProofScreenshot}
                      </label>

                      {paymentProofUrl ? (
                        <div className="relative p-3 rounded-2xl bg-[var(--bg-surface)] border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border theme-border flex-shrink-0">
                              <Image src={getImageUrl(paymentProofUrl)} alt="Proof" fill className="object-cover" />
                            </div>
                            <div>
                              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <span>{t.proofUploaded}</span>
                              </p>
                              <a
                                href={paymentProofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-indigo-600 underline font-medium"
                              >
                                {t.viewUploadedImage}
                              </a>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setPaymentProofUrl('')}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition text-xs font-bold flex items-center gap-1"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                            <span>{t.remove}</span>
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-purple-300 dark:border-purple-700/60 rounded-2xl bg-[var(--bg-surface)] hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition cursor-pointer text-center group">
                          {uploadingProof ? (
                            <div className="flex flex-col items-center gap-2 text-purple-600">
                              <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" />
                              <span className="text-xs font-bold">{t.uploadingScreenshot}</span>
                            </div>
                          ) : (
                            <>
                              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center text-base mb-2 group-hover:scale-110 transition">
                                <FontAwesomeIcon icon={faUpload} />
                              </div>
                              <span className="text-xs font-bold text-[var(--text-primary)]">
                                {t.clickToUploadScreenshot}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)] mt-1">PNG, JPG, WEBP (Max 8MB)</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProofFileUpload}
                            disabled={uploadingProof}
                            className="hidden"
                          />
                        </label>
                      )}

                      {uploadError && (
                        <p className="text-[11px] font-bold text-rose-500 mt-1">{uploadError}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Mobile Wallets Screenshot Upload Section */}
                {paymentMethod === 'WALLETS' && isWalletsEnabled && (
                  <div className="p-5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/50 space-y-4 animate-fadeIn text-xs">
                    <div className="space-y-1.5">
                      <h4 className="font-extrabold text-rose-900 dark:text-rose-200 flex items-center gap-2">
                        <FontAwesomeIcon icon={faMobileScreen} className="text-rose-600" />
                        <span>{t.walletsInstructions}</span>
                      </h4>
                      <div className="p-3 bg-[var(--bg-surface)] rounded-xl border theme-border text-[11px] space-y-1.5">
                        {Boolean(serverSettings?.paymentWalletsNumber) && (
                          <p className="font-bold text-[var(--text-primary)]">
                            t.walletNumberToTransfer{' '}
                            <span className="font-mono text-rose-600 select-all font-black text-sm">
                              {serverSettings.paymentWalletsNumber}
                            </span>
                          </p>
                        )}
                        <p className="text-[var(--text-secondary)]">
                          {`${t.amountToTransfer} ${formatPrice(finalTotalAmount, currency, language)}`}
                        </p>
                        {Boolean(serverSettings?.paymentWalletsInstructions) && (
                          <p className="text-[10px] text-[var(--text-muted)] border-t theme-border pt-1">
                            {serverSettings.paymentWalletsInstructions}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Screenshot Upload UI */}
                    <div className="space-y-2">
                      <label className="block font-extrabold text-[var(--text-primary)]">
                        {t.attachWalletScreenshot}
                      </label>

                      {paymentProofUrl ? (
                        <div className="relative p-3 rounded-2xl bg-[var(--bg-surface)] border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border theme-border flex-shrink-0">
                              <Image src={getImageUrl(paymentProofUrl)} alt="Proof" fill className="object-cover" />
                            </div>
                            <div>
                              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <span>{t.proofUploaded}</span>
                              </p>
                              <a
                                href={paymentProofUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-indigo-600 underline font-medium"
                              >
                                {t.viewUploadedImage}
                              </a>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setPaymentProofUrl('')}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition text-xs font-bold flex items-center gap-1"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                            <span>{t.remove}</span>
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-rose-300 dark:border-rose-700/60 rounded-2xl bg-[var(--bg-surface)] hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition cursor-pointer text-center group">
                          {uploadingProof ? (
                            <div className="flex flex-col items-center gap-2 text-rose-600">
                              <FontAwesomeIcon icon={faSpinner} spin className="text-2xl" />
                              <span className="text-xs font-bold">{t.uploadingScreenshot}</span>
                            </div>
                          ) : (
                            <>
                              <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 flex items-center justify-center text-base mb-2 group-hover:scale-110 transition">
                                <FontAwesomeIcon icon={faUpload} />
                              </div>
                              <span className="text-xs font-bold text-[var(--text-primary)]">
                                {t.clickToUploadScreenshot}
                              </span>
                              <span className="text-[10px] text-[var(--text-muted)] mt-1">PNG, JPG, WEBP (Max 8MB)</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleProofFileUpload}
                            disabled={uploadingProof}
                            className="hidden"
                          />
                        </label>
                      )}

                      {uploadError && (
                        <p className="text-[11px] font-bold text-rose-500 mt-1">{uploadError}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Fawry Payment Guidance */}
                {paymentMethod === 'FAWRY' && isFawryEnabled && (
                  <div className="p-5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 space-y-2 animate-fadeIn text-xs">
                    <h4 className="font-extrabold text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <FontAwesomeIcon icon={faCoins} className="text-amber-600" />
                      <span>{t.fawryPayDetails}</span>
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                      {serverSettings?.paymentFawryInstructions || (t.fawryPayDesc)}
                    </p>
                  </div>
                )}

                {/* COD Deposit Notice & Proof Upload Section */}
                {paymentMethod === 'COD' && isDepositApplicable && depositAmount > 0 && (
                  <div className="p-5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-700/60 space-y-4 animate-fadeIn text-xs shadow-sm">
                    <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800/60 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold">
                          <FontAwesomeIcon icon={faLock} />
                        </div>
                        <div>
                          <h4 className="font-black text-amber-900 dark:text-amber-200 text-xs">
                            {t.depositRequiredTitle}
                          </h4>
                          <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
                            {t.depositRequiredDesc}
                          </p>
                        </div>
                      </div>
                      <div className="text-end">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 block">{t.depositDue}</span>
                        <span className="font-black text-sm font-mono text-amber-900 dark:text-amber-100">
                          {formatPrice(depositAmount, currency, language)}
                        </span>
                      </div>
                    </div>

                    {/* Deposit Instructions & Channels */}
                    <div className="p-3.5 bg-[var(--bg-surface)] rounded-xl border theme-border space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="font-extrabold text-[var(--text-primary)] text-xs flex items-center gap-1.5">
                          <FontAwesomeIcon icon={faMoneyBillWave} className="text-amber-500" />
                          <span>{t.depositChannels}</span>
                        </p>
                        <span className="text-[10px] text-[var(--text-muted)] font-medium">
                          {t.choosePreferredMethod}
                        </span>
                      </div>

                      {Boolean(serverSettings?.depositInstructions) && (
                        <p className="text-[11px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed bg-[var(--bg-card)] p-2.5 rounded-lg border theme-border">
                          {serverSettings.depositInstructions}
                        </p>
                      )}

                      {/* Deposit Payment Channels Cards (Only shown if actively enabled in settings) */}
                      {(isInstapayEnabled || isWalletsEnabled) && (
                        <div className={`grid gap-2 ${isInstapayEnabled && isWalletsEnabled ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                          {/* Instapay Channel */}
                          {isInstapayEnabled && (
                            <div className="p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 flex flex-col justify-between gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-extrabold text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                                  <FontAwesomeIcon icon={faBolt} className="text-purple-600" />
                                  <span>{t.instapayTitle}</span>
                                </span>
                                <span className="text-[9px] font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/60 px-1.5 py-0.5 rounded">
                                  {t.instantTransfer}
                                </span>
                              </div>
                              {Boolean(serverSettings?.paymentInstapayAddress) ? (
                                <div className="flex items-center justify-between gap-1 bg-[var(--bg-surface)] px-2 py-1 rounded-lg border theme-border text-[11px]">
                                  <span className="text-[10px] text-[var(--text-muted)]">{t.addressIpa}</span>
                                  <span className="font-mono text-purple-700 dark:text-purple-300 font-black select-all tracking-wide truncate">
                                    {serverSettings.paymentInstapayAddress}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-[10px] text-[var(--text-muted)]">{t.availableViaApp}</p>
                              )}
                            </div>
                          )}

                          {/* Mobile Wallets Channel (Vodafone Cash, etc.) */}
                          {isWalletsEnabled && (
                            <div className="p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/50 flex flex-col justify-between gap-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-extrabold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                                  <FontAwesomeIcon icon={faMobileScreen} className="text-rose-600" />
                                  <span>{t.mobileCashWallets}</span>
                                </span>
                                <span className="text-[9px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-900/60 px-1.5 py-0.5 rounded">
                                  {t.cashWallet}
                                </span>
                              </div>
                              {Boolean(serverSettings?.paymentWalletsNumber) ? (
                                <div className="flex items-center justify-between gap-1 bg-[var(--bg-surface)] px-2 py-1 rounded-lg border theme-border text-[11px]">
                                  <span className="text-[10px] text-[var(--text-muted)]">{t.numberLabel}</span>
                                  <span className="font-mono text-rose-700 dark:text-rose-300 font-black select-all tracking-wide">
                                    {serverSettings.paymentWalletsNumber}
                                  </span>
                                </div>
                              ) : (
                                <p className="text-[10px] text-[var(--text-muted)]">{t.availableViaWallet}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Deposit Receipt Upload (Required) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block font-extrabold text-[var(--text-primary)] text-xs">
                          {t.attachDepositReceipt}
                        </label>
                        <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/60 px-2 py-0.5 rounded-md">
                          {t.depositReceiptRequiredBadge || (isRTL ? 'إجباري *' : 'Required *')}
                        </span>
                      </div>

                      {paymentProofUrl ? (
                        <div className="relative p-3 rounded-2xl bg-[var(--bg-surface)] border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900 border theme-border flex-shrink-0">
                              <Image src={getImageUrl(paymentProofUrl)} alt="Deposit Proof" fill className="object-cover" />
                            </div>
                            <div>
                              <p className="font-bold text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-1">
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <span>{t.depositReceiptAttached}</span>
                              </p>
                              <a href={paymentProofUrl} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 underline font-medium">
                                {t.viewReceipt}
                              </a>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setPaymentProofUrl('')}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition text-xs font-bold"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-amber-400 dark:border-amber-600/70 rounded-2xl bg-[var(--bg-surface)] hover:bg-amber-50/40 dark:hover:bg-amber-950/30 transition cursor-pointer text-center group">
                          {uploadingProof ? (
                            <div className="flex items-center gap-2 text-amber-600 py-2">
                              <FontAwesomeIcon icon={faSpinner} spin className="text-lg" />
                              <span className="text-xs font-bold">{t.uploadingReceipt}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 py-1">
                              <div className="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center text-sm">
                                <FontAwesomeIcon icon={faUpload} />
                              </div>
                              <div className="text-start">
                                <span className="text-xs font-bold text-[var(--text-primary)] block">
                                  {t.clickToAttachDeposit}
                                </span>
                                <span className="text-[10px] text-[var(--text-muted)]">PNG, JPG, WEBP (Max 8MB)</span>
                              </div>
                            </div>
                          )}
                          <input type="file" accept="image/*" onChange={handleProofFileUpload} disabled={uploadingProof} className="hidden" />
                        </label>
                      )}
                    </div>

                    {/* Disclaimer Note & Policy Agreement Checkbox (Required) */}
                    <div className="space-y-2.5 pt-1">
                      <div className="text-[10px] text-amber-800 dark:text-amber-300/90 bg-amber-100/50 dark:bg-amber-900/20 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/40 leading-relaxed">
                        ⚠️ {serverSettings?.depositPolicyText || (t.depositNotice)}
                      </div>

                      <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-100/60 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700/60 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/40 transition select-none">
                        <input
                          type="checkbox"
                          checked={depositPolicyAgreed}
                          onChange={(e) => setDepositPolicyAgreed(e.target.checked)}
                          className="mt-0.5 w-4 h-4 text-amber-600 rounded border-amber-400 focus:ring-amber-500 cursor-pointer flex-shrink-0"
                        />
                        <span className="text-[11px] font-bold text-amber-950 dark:text-amber-100 leading-snug">
                          {serverSettings?.depositPolicyText
                            ? `${serverSettings.depositPolicyText} *`
                            : (t.depositPolicyAgreeCheckbox || (isRTL
                                ? 'أوافق على دفع العربون لتأكيد حجز الطلب وأقر بسياسة عدم الإلغاء بعد بدء التجهيز والشحن *'
                                : 'I agree to the upfront deposit and the anti-cancellation policy once processing/shipping begins *'))}
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Card Fields if CARD selected */}
                {paymentMethod === 'CARD' && isCardEnabled && (
                  <div className="p-5 rounded-2xl bg-[var(--bg-card)] border theme-border space-y-3 animate-fadeIn text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[var(--text-primary)]">{t.cardDetailsTitle}</span>
                      {Boolean(serverSettings?.paymentCardGateway) && (
                        <span className="text-[10px] font-mono uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-md font-bold">
                          {serverSettings.paymentCardGateway} {serverSettings.paymentCardTestMode ? '(Test Mode)' : '(Live)'}
                        </span>
                      )}
                    </div>
                    <div>
                      <label className="block font-semibold text-[var(--text-secondary)] mb-1">{tPay.cardNumber}</label>
                      <input
                        type="text"
                        value={cardData.number}
                        onChange={handleCardNumberChange}
                        placeholder="4242 4242 4242 4242"
                        className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl p-3 border theme-border font-mono text-sm tracking-wider focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block font-semibold text-[var(--text-secondary)] mb-1">{tPay.cardExpiry}</label>
                        <input
                          type="text"
                          value={cardData.expiry}
                          onChange={handleExpiryChange}
                          placeholder="12/28"
                          className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl p-3 border theme-border font-mono text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold text-[var(--text-secondary)] mb-1">{tPay.cardCvc}</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardData.cvc}
                          onChange={(e) => setCardData({ ...cardData, cvc: e.target.value.replace(/\D/g, '') })}
                          placeholder="•••"
                          className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-xl p-3 border theme-border font-mono text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="pt-4 border-t theme-border">
                <button type="submit" disabled={submitting}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer">
                  <FontAwesomeIcon icon={faLock} />
                  <span>
                    {submitting
                      ? t.processing
                      : isDepositApplicable && depositAmount > 0
                      ? `${t.confirmOrderAndPayDeposit} (${formatPrice(depositAmount, currency, language)})`
                      : `${t.completeOrder} — ${formatPrice(finalTotalAmount, currency, language)}`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Summary Column */}
        <div className="lg:col-span-5 space-y-6">
          <div className="glass-panel p-6 rounded-3xl border theme-border space-y-4 shadow-sm">
            <h2 className="text-base font-extrabold text-[var(--text-primary)] tracking-tight border-b theme-border pb-4">
              {t.orderSummary} ({items.length} {t.items})
            </h2>
            <div className="space-y-3 max-h-80 overflow-y-auto pe-1">
              {items.map((item) => (
                <div key={`${item.id}-${item.variantId || 'default'}`} className="flex items-center justify-between text-xs py-2 border-b theme-border">
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-950 overflow-hidden flex-shrink-0">
                      <Image src={getImageUrl(item.image)} alt={item.title} fill className="object-cover" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--text-primary)] line-clamp-1">{item.title}</h4>
                      {item.selectedColor && (
                        <span className="text-[10px] font-semibold text-[var(--text-secondary)]">
                          {t.color} {item.selectedColor}
                        </span>
                      )}
                      <p className="text-[var(--text-secondary)]">{item.quantity} × {formatPrice(item.price, currency, language)}</p>
                    </div>
                  </div>
                  <span className="font-bold text-[var(--text-primary)] font-mono">{formatPrice(item.price * item.quantity, currency, language)}</span>
                </div>
              ))}
            </div>

            {/* Loyalty Points Redemption (if logged in & has points) */}
            {session?.user && userPoints > 0 && (
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faCoins} className="text-amber-500" />
                    <span>{tPay.redeemPointsTitle}</span>
                  </span>
                  <span className="font-bold font-mono text-amber-600">{userPoints} pts</span>
                </div>
                {pointsToRedeem > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-600 font-bold">
                      {tPay.pointsApplied} (-{formatPrice(pointsDiscount, currency, language)})
                    </span>
                    <button
                      type="button"
                      onClick={() => setPointsToRedeem(0)}
                      className="text-[11px] text-rose-500 underline font-bold"
                    >
                      {t.cancel}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPointsToRedeem(Math.min(userPoints, Math.floor(subtotalAmount * pointsRedemptionRate)))}
                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-[11px] transition shadow-sm cursor-pointer"
                  >
                    {t.redeem} {Math.min(userPoints, Math.floor(subtotalAmount * pointsRedemptionRate))} {t.points} ( {formatPrice(Math.min(userPoints, Math.floor(subtotalAmount * pointsRedemptionRate)) / pointsRedemptionRate, currency, language)})
                  </button>
                )}
              </div>
            )}

            {/* Promo Code Input Box */}
            <div className="pt-2 border-t theme-border space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)]">{t.promoCodeLabel || 'Promo Code'}</label>
              {appliedPromo ? (
                <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <div>
                    <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 me-2">{appliedPromo.code}</span>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">
                      ({t.promoCodeApplied || 'Applied'})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-[11px] font-bold text-red-500 hover:text-red-600 underline cursor-pointer"
                  >
                    {t.promoCodeRemove || 'Remove'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyPromo} className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder={t.promoCodePlaceholder || 'SUMMER20'}
                    className="flex-1 px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl border theme-border bg-[var(--bg-surface)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={promoLoading || !promoInput.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                  >
                    {promoLoading ? '...' : (t.promoCodeApply || 'Apply')}
                  </button>
                </form>
              )}

              {promoError && (
                <p className="text-[11px] font-bold text-rose-500 mt-1">{promoError}</p>
              )}
            </div>

            <div className="space-y-2 pt-2 text-xs">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>{t.subtotal}</span>
                <span className="text-[var(--text-primary)] font-medium font-mono">{formatPrice(subtotalAmount, currency, language)}</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>{t.discount || 'Discount'} ({appliedPromo.code})</span>
                  <span className="font-mono">-{formatPrice(promoDiscount, currency, language)}</span>
                </div>
              )}
              {pointsToRedeem > 0 && (
                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-bold">
                  <span>{t.pointsDiscount} ({pointsToRedeem} {t.points})</span>
                  <span className="font-mono">-{formatPrice(pointsDiscount, currency, language)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>{t.delivery}</span>
                <span className="font-semibold text-[var(--text-primary)]">
                  {serverSettings?.shippingFee && serverSettings.shippingFee > 0
                    ? formatPrice(serverSettings.shippingFee, currency, language)
                    : t.standardShipping}
                </span>
              </div>

              {/* COD Extra Handling Fee if active */}
              {paymentMethod === 'COD' && Boolean(serverSettings?.paymentCodExtraFee && serverSettings.paymentCodExtraFee > 0) && (
                <div className="flex justify-between text-amber-700 dark:text-amber-300 font-semibold text-xs animate-fadeIn">
                  <span className="flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faTruck} className="text-amber-500 text-[10px]" />
                    <span>{t.codFee}</span>
                  </span>
                  <span className="font-mono font-bold">+{formatPrice(serverSettings.paymentCodExtraFee || 0, currency, language)}</span>
                </div>
              )}

              <p className="text-[11px] text-[var(--text-muted)]">{t.taxNote}</p>
              <div className="flex justify-between text-base font-black text-[var(--text-primary)] pt-3 border-t theme-border">
                <span>{t.total}</span>
                <span className="text-indigo-600 font-mono">{formatPrice(finalTotalAmount, currency, language)}</span>
              </div>

              {/* Deposit Breakdown in Summary */}
              {isDepositApplicable && depositAmount > 0 && (
                <div className="mt-3 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 space-y-2 animate-fadeIn">
                  <div className="flex justify-between items-center text-xs font-bold text-amber-800 dark:text-amber-200">
                    <span className="flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faLock} className="text-amber-500" />
                      <span>{t.depositDueNow}</span>
                    </span>
                    <span className="font-mono font-black text-sm text-amber-600 dark:text-amber-300">
                      {formatPrice(depositAmount, currency, language)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-[var(--text-secondary)] border-t border-amber-200/60 dark:border-amber-800/40 pt-1.5">
                    <span>{t.remainingOnDelivery}</span>
                    <span className="font-mono font-black text-[var(--text-primary)]">
                      {formatPrice(remainingAmount, currency, language)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
