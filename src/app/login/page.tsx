'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faSignInAlt, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';
  const { language, serverSettings } = useSettings();
  const t = translations[language].login;

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const result = await signIn('credentials', { redirect: false, email: formData.email, password: formData.password });
      if (result?.ok) router.push(callbackUrl);
      else setError(result?.error || 'Invalid credentials.');
    } catch { setError('Authentication failed.'); }
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
              : (serverSettings?.storeName ? `Sign In to ${serverSettings.storeName}` : t.title)}
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">{t.subtitle}</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/80 border border-red-300 dark:border-red-700 p-3 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-200">
            <FontAwesomeIcon icon={faExclamationCircle} className="text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t.email}</label>
            <div className="relative">
              <input type="email" name="email" required value={formData.email} onChange={handleChange}
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-xl ps-10 pe-4 py-3 border theme-border focus:outline-none focus:border-indigo-500"
                placeholder="user@example.com" />
              <FontAwesomeIcon icon={faEnvelope} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">{t.password}</label>
            <div className="relative">
              <input type="password" name="password" required value={formData.password} onChange={handleChange}
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-sm rounded-xl ps-10 pe-4 py-3 border theme-border focus:outline-none focus:border-indigo-500"
                placeholder="••••••••" />
              <FontAwesomeIcon icon={faLock} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs" />
            </div>
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition">
            <FontAwesomeIcon icon={faSignInAlt} />
            <span>{loading ? t.authenticating : t.signIn}</span>
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="bg-[var(--bg-surface)] border theme-border rounded-xl p-4 space-y-1.5 text-xs text-[var(--text-secondary)]">
          <p className="font-bold text-[var(--text-primary)] mb-2">{t.demoTitle}</p>
          <p><strong className="text-indigo-600">{t.demoAdmin}</strong> admin@example.com &nbsp;|&nbsp; <strong className="text-[var(--text-primary)]">{t.pass}</strong> admin123</p>
          <p><strong className="text-indigo-600">{t.demoUser}</strong> john@example.com &nbsp;|&nbsp; <strong className="text-[var(--text-primary)]">{t.pass}</strong> user123</p>
        </div>

        <p className="text-center text-xs text-[var(--text-secondary)]">
          {t.noAccount}{' '}
          <Link href="/register" className="text-indigo-600 font-bold hover:underline">{t.register}</Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="text-[var(--text-muted)]">Loading...</span></div>}>
      <LoginForm />
    </Suspense>
  );
}
