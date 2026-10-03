'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faEnvelope, faLock, faExclamationCircle, faCheckCircle, faGift } from '@fortawesome/free-solid-svg-icons';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { language, serverSettings } = useSettings();
  const t = translations[language].register;
  const isRTL = language === 'ar';

  const refCode = searchParams.get('ref') || '';

  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, referralCode: refCode || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');
      setSuccess(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (err: any) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-primary)]">
      <div className="w-full max-w-md glass-panel p-8 sm:p-10 rounded-3xl border theme-border shadow-xl space-y-6">
        <div className="text-center space-y-1">
          {serverSettings?.storeLogo ? (
            <div className="mb-3 flex justify-center">
              <img
                src={serverSettings.storeLogo}
                alt={serverSettings.storeName}
                className="h-14 max-w-[200px] object-contain"
              />
            </div>
          ) : (
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20 mb-3">
              {serverSettings?.storeName ? serverSettings.storeName.trim().charAt(0).toUpperCase() : 'S'}
            </div>
          )}
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">
            {language === 'ar'
              ? (serverSettings?.storeName ? `${t.title} - ${serverSettings.storeName}` : t.title)
              : (serverSettings?.storeName ? `Create an Account at ${serverSettings.storeName}` : t.title)}
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">{t.subtitle}</p>
        </div>

        {/* Referral Banner */}
        {refCode && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/60 dark:to-yellow-950/60 border border-amber-300 dark:border-amber-700 p-3 rounded-xl flex items-center gap-2.5 text-xs">
            <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
              <FontAwesomeIcon icon={faGift} />
            </div>
            <div>
              <p className="font-extrabold text-amber-700 dark:text-amber-400">
                {translations[language].popup.title}
              </p>
              <p className="text-amber-600 dark:text-amber-500 mt-0.5">
                {translations[language].popup.subtitle}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/80 border border-red-300 dark:border-red-700 p-3 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-200">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 p-3 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-200">
            <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 flex-shrink-0" />
            <span>{translations[language].auth.success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {[
            { name: 'name', label: t.fullName, type: 'text', icon: faUser, placeholder: translations[language].reviews.namePlaceholder },
            { name: 'email', label: t.email, type: 'email', icon: faEnvelope, placeholder: 'example@mail.com' },
            { name: 'password', label: t.password, type: 'password', icon: faLock, placeholder: '••••••••' },
          ].map((field) => (
            <div key={field.name}>
              <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{field.label}</label>
              <div className="relative">
                <input
                  type={field.type} name={field.name} required
                  value={(formData as any)[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-xl ps-10 pe-4 py-3 border theme-border focus:outline-none focus:border-indigo-500"
                />
                <FontAwesomeIcon icon={field.icon} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
              </div>
            </div>
          ))}

          <button type="submit" disabled={loading || success}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 transition">
            {loading ? t.submitting : t.submit}
          </button>
        </form>

        <p className="text-center text-xs text-[var(--text-secondary)]">
          {t.hasAccount}{' '}
          <Link href="/login" className="text-indigo-600 font-bold hover:underline">{t.signIn}</Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>}>
      <RegisterForm />
    </Suspense>
  );
}
