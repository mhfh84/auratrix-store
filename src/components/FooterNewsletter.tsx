'use client';

import React, { useState, useEffect } from 'react';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCrown,
  faEnvelope,
  faCheck,
  faCopy,
  faBolt,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';

function getBrowserFingerprintId(): string {
  try {
    const key = 'auratrix_fp_id';
    let fp = localStorage.getItem(key);
    if (!fp) {
      fp = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem(key, fp);
    }
    return fp;
  } catch {
    return '';
  }
}

export default function FooterNewsletter() {
  const { language } = useSettings();
  const t = translations[language].newsletter;
  const isRTL = language === 'ar';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [claimedNotice, setClaimedNotice] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [couponCode, setCouponCode] = useState('VIP10');

  useEffect(() => {
    try {
      const saved = localStorage.getItem('auratrix-vip-subscriber');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.isSubscribed) {
          setSubscribed(true);
          if (parsed.code) setCouponCode(parsed.code);
        }
      }
    } catch (e) {
      // Ignore localStorage read errors
    }
  }, []);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setClaimedNotice('');

    if (!email || !email.includes('@') || !email.includes('.')) {
      setErrorMsg(t.invalidEmail);
      return;
    }

    const fingerprintId = getBrowserFingerprintId();

    setLoading(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fingerprintId }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const code = data.couponCode || 'VIP10';
        setCouponCode(code);
        setSubscribed(true);

        if (data.alreadyClaimed) {
          setClaimedNotice(t.alreadyClaimedNotice);
        }

        try {
          localStorage.setItem(
            'auratrix-vip-subscriber',
            JSON.stringify({ isSubscribed: true, email, code, date: Date.now() })
          );
        } catch (err) {}
      } else {
        setErrorMsg(data.error || 'Failed to subscribe');
      }
    } catch (err) {
      setErrorMsg(t.invalidEmail);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(couponCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (e) {}
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 text-white p-6 sm:p-10 mb-12 shadow-2xl border border-indigo-500/30">
      {/* Background ambient lighting */}
      <div className="absolute -top-24 -end-24 w-72 h-72 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -start-24 w-72 h-72 rounded-full bg-pink-500/15 blur-3xl pointer-events-none" />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Heading & VIP Details */}
        <div className="lg:col-span-7 space-y-3 text-center lg:text-start">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 text-amber-300 px-3.5 py-1 rounded-full text-xs font-bold shadow-sm">
            <FontAwesomeIcon icon={faCrown} className="text-amber-400" />
            <span>{t.vipBadge}</span>
          </div>

          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
            {t.vipTitle}
          </h3>
          <p className="text-xs sm:text-sm text-indigo-200/90 leading-relaxed max-w-xl">
            {t.vipSubtitle}
          </p>
        </div>

        {/* Right Column: Form or Success Card */}
        <div className="lg:col-span-5">
          {subscribed ? (
            <div className="bg-white/10 backdrop-blur-xl border border-emerald-400/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-300">
              <div className="flex items-center gap-2.5 text-emerald-400 font-bold text-sm">
                <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <FontAwesomeIcon icon={faCheck} className="text-emerald-400 text-xs" />
                </div>
                <span>{t.successTitle}</span>
              </div>
              <p className="text-xs text-indigo-100/90">
                {t.successDesc}
              </p>

              {/* Coupon display with copy button */}
              <div className="flex items-center justify-between bg-black/40 border border-indigo-400/40 rounded-xl p-2.5 sm:p-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base sm:text-lg font-black tracking-widest text-amber-300">
                    {couponCode}
                  </span>
                  <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded-md font-bold uppercase">
                    10% OFF
                  </span>
                </div>

                <button
                  onClick={handleCopyCode}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                    copied
                      ? 'bg-emerald-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="text-xs" />
                  <span>{copied ? t.couponCopied : t.copyCoupon}</span>
                </button>
              </div>

              {claimedNotice && (
                <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/30 p-2.5 rounded-xl">
                  <FontAwesomeIcon icon={faInfoCircle} className="text-xs flex-shrink-0" />
                  <span>{claimedNotice}</span>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 start-0 ps-3.5 flex items-center pointer-events-none text-indigo-300 text-xs">
                    <FontAwesomeIcon icon={faEnvelope} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.placeholder}
                    required
                    className="w-full text-xs sm:text-sm ps-9 pe-4 py-3.5 rounded-xl bg-white/10 border border-white/20 text-white placeholder-indigo-300/70 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white/15 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-gray-950 font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition active:scale-95 whitespace-nowrap disabled:opacity-50"
                >
                  {loading ? (
                    <span>{t.subscribing}</span>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faBolt} className="text-xs" />
                      <span>{t.subscribe}</span>
                    </>
                  )}
                </button>
              </div>

              {errorMsg && (
                <p className="text-xs text-rose-400 font-semibold">{errorMsg}</p>
              )}

              <p className="text-[11px] text-indigo-300/70 text-center lg:text-start">
                🔒 {t.privacyNote}
              </p>
            </form>
          )}
        </div>

      </div>
    </div>
  );
}
