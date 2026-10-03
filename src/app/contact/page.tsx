'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeadset,
  faEnvelope,
  faPhone,
  faClock,
  faPaperPlane,
  faCheckCircle,
  faExclamationCircle,
  faCircleQuestion,
  faBuilding,
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

export default function ContactPage() {
  const { language, serverSettings } = useSettings();
  const t = translations[language].contactPage;
  const isRTL = language === 'ar';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    orderId: '',
    subject: 'general',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      setError(t.fillRequired);
      return;
    }

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t.errorMsg);
      }

      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        orderId: '',
        subject: 'general',
        message: '',
      });
    } catch (err: any) {
      setError(err.message || t.errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
      {/* Header Banner */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800/50 text-sky-600 dark:text-sky-400 text-xs font-black tracking-wide">
          <FontAwesomeIcon icon={faHeadset} />
          <span>{t.supportBadge}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[var(--text-primary)] tracking-tight">
          {t.title}
        </h1>
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      {/* Main Grid: Form (Left/Main) & Info Channels (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Contact Form */}
        <div className="lg:col-span-2 glass-panel p-6 sm:p-10 rounded-3xl border theme-border shadow-xl space-y-6">
          <div className="space-y-1 border-b theme-border pb-4">
            <h2 className="text-lg sm:text-xl font-black text-[var(--text-primary)]">
              {t.formTitle}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {t.formDesc}
            </p>
          </div>

          {success && (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-3 animate-fadeIn">
              <FontAwesomeIcon icon={faCheckCircle} className="text-lg flex-shrink-0" />
              <span>{t.successMsg}</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-700/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-3 animate-fadeIn">
              <FontAwesomeIcon icon={faExclamationCircle} className="text-lg flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  {t.nameLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t.namePlaceholder}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl px-4 py-3 border theme-border focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  {t.emailLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder={t.emailPlaceholder}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl px-4 py-3 border theme-border focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Phone */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  {t.phoneLabel}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder={t.phonePlaceholder}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl px-4 py-3 border theme-border focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                />
              </div>

              {/* Order ID */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-primary)]">
                  {t.orderIdLabel}
                </label>
                <input
                  type="text"
                  value={formData.orderId}
                  onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                  placeholder={t.orderIdPlaceholder}
                  className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl px-4 py-3 border theme-border focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition font-mono"
                />
              </div>
            </div>

            {/* Subject Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                {t.subjectLabel}
              </label>
              <select
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl px-4 py-3 border theme-border focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              >
                <option value="general">{t.subjectGeneral}</option>
                <option value="order">{t.subjectOrder}</option>
                <option value="return">{t.subjectReturn}</option>
                <option value="payment">{t.subjectPayment}</option>
                <option value="warranty">{t.subjectWarranty}</option>
                <option value="other">{t.subjectOther}</option>
              </select>
            </div>

            {/* Message Textarea */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-primary)]">
                {t.messageLabel} <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={5}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder={t.messagePlaceholder}
                className="w-full bg-[var(--bg-surface)] text-[var(--text-primary)] text-xs rounded-xl p-4 border theme-border focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition leading-relaxed resize-y"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faPaperPlane} />
              <span>{loading ? t.submitting : t.submitBtn}</span>
            </button>
          </form>
        </div>

        {/* Support Channels & Info */}
        <div className="space-y-6">
          
          {/* Direct Channels Card */}
          <div className="glass-panel p-6 rounded-3xl border theme-border space-y-5 shadow-md">
            <h3 className="text-sm font-black uppercase tracking-wider text-[var(--text-primary)]">
              {t.channelsTitle}
            </h3>

            {/* WhatsApp */}
            {serverSettings?.socialWhatsApp && (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/50 space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <FontAwesomeIcon icon={faWhatsapp} className="text-lg" />
                  <span className="text-xs font-extrabold">{t.whatsappTitle}</span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-snug">
                  {t.whatsappDesc}
                </p>
                <a
                  href={serverSettings.socialWhatsApp}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-sm"
                >
                  <span>{t.whatsappBtn}</span>
                </a>
              </div>
            )}

            {/* Phone */}
            {serverSettings?.contactPhone && (
              <div className="space-y-1 text-xs">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.phoneTitle}
                </span>
                <a
                  href={`tel:${serverSettings.contactPhone}`}
                  className="font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-2 font-mono"
                >
                  <FontAwesomeIcon icon={faPhone} />
                  <span>{serverSettings.contactPhone}</span>
                </a>
                <p className="text-[10px] text-[var(--text-secondary)]">{t.phoneDesc}</p>
              </div>
            )}

            {/* Email */}
            {serverSettings?.contactEmail && (
              <div className="space-y-1 text-xs pt-2 border-t theme-border">
                <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                  {t.emailTitle}
                </span>
                <a
                  href={`mailto:${serverSettings.contactEmail}`}
                  className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2 font-mono break-all"
                >
                  <FontAwesomeIcon icon={faEnvelope} />
                  <span>{serverSettings.contactEmail}</span>
                </a>
                <p className="text-[10px] text-[var(--text-secondary)]">{t.emailDesc}</p>
              </div>
            )}

            {/* Operating Hours */}
            <div className="space-y-1 text-xs pt-2 border-t theme-border">
              <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <FontAwesomeIcon icon={faClock} />
                <span>{t.hoursTitle}</span>
              </span>
              <p className="text-[11px] font-medium text-[var(--text-primary)] leading-relaxed">
                {t.hoursDesc}
              </p>
            </div>
          </div>

          {/* FAQ Shortcut Box */}
          <div className="glass-card p-6 rounded-3xl border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3 shadow-md">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm shadow-md shadow-indigo-600/25">
              <FontAwesomeIcon icon={faCircleQuestion} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-[var(--text-primary)]">
                {t.faqShortcutTitle}
              </h4>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                {t.faqShortcutDesc}
              </p>
            </div>
            <Link
              href="/faq"
              className="inline-flex items-center gap-1.5 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              <span>{t.faqShortcutBtn}</span>
              <span>&rarr;</span>
            </Link>
          </div>

        </div>

      </div>
    </div>
  );
}
