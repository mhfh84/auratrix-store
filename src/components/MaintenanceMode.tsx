'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSettings } from '@/store/useSettingsStore';
import { useSession } from 'next-auth/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faScrewdriverWrench, faEnvelope, faPhone, faShieldHalved, faLock, faSliders } from '@fortawesome/free-solid-svg-icons';
import { faFacebook, faInstagram, faTwitter, faTiktok, faWhatsapp } from '@fortawesome/free-brands-svg-icons';

import { translations, getLocalizedText } from '@/lib/translations';

export default function MaintenanceMode({ children }: { children: React.ReactNode }) {
  const { serverSettings, language } = useSettings();
  const { data: session } = useSession();
  const pathname = usePathname() || '';
  const t = translations[language].maintenanceMode;

  const isMaintenance = serverSettings?.maintenanceMode;
  const role = (session?.user as any)?.role;
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR';

  // Always allow admin/login/auth paths even during maintenance mode
  const isExemptPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/settings');

  if (!isMaintenance || isExemptPath) {
    return <>{children}</>;
  }

  // If Admin is logged in, show a banner at the top but render the store normally
  if (isAdmin) {
    return (
      <>
        <div className="bg-amber-500 text-slate-950 font-bold text-xs py-2 px-4 text-center flex items-center justify-center gap-3 shadow-md z-50 relative">
          <FontAwesomeIcon icon={faShieldHalved} />
          <span>{t.adminBanner}</span>
          <Link
            href="/admin/settings"
            className="ms-2 px-2.5 py-0.5 rounded-full bg-slate-950 text-white text-[11px] font-extrabold hover:bg-slate-800 transition inline-flex items-center gap-1"
          >
            <FontAwesomeIcon icon={faSliders} className="text-[10px]" />
            <span>{t.manageSettings}</span>
          </Link>
        </div>
        {children}
      </>
    );
  }

  const maintMsg = serverSettings?.maintenanceMessage
    ? getLocalizedText(serverSettings.maintenanceMessage, language)
    : t.defaultMsg;

  // Visitor screen during maintenance
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-xl glass-panel p-8 sm:p-12 rounded-3xl border theme-border shadow-2xl space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center text-4xl shadow-inner border border-indigo-600/20">
          <FontAwesomeIcon icon={faScrewdriverWrench} className="animate-pulse" />
        </div>

        {serverSettings.storeLogo && (
          <img src={serverSettings.storeLogo} alt={serverSettings.storeName} className="h-14 mx-auto object-contain mb-2" />
        )}
        <h1 className="text-2xl font-black text-[var(--text-primary)]">{serverSettings.storeName || 'Store'}</h1>

        <div className="space-y-3">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            {t.title}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            {maintMsg}
          </p>
        </div>

        {/* Contact info */}
        <div className="pt-4 border-t theme-border flex flex-wrap items-center justify-center gap-4 text-xs text-[var(--text-secondary)] font-medium">
          {serverSettings.contactEmail && (
            <a href={`mailto:${serverSettings.contactEmail}`} className="flex items-center gap-1.5 hover:text-indigo-600 transition">
              <FontAwesomeIcon icon={faEnvelope} />
              <span>{serverSettings.contactEmail}</span>
            </a>
          )}
          {serverSettings.contactPhone && (
            <a href={`tel:${serverSettings.contactPhone}`} className="flex items-center gap-1.5 hover:text-indigo-600 transition">
              <FontAwesomeIcon icon={faPhone} />
              <span>{serverSettings.contactPhone}</span>
            </a>
          )}
        </div>

        {/* Social media icons */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {serverSettings.socialFacebook && serverSettings.socialFacebookEnabled && (
            <a href={serverSettings.socialFacebook} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border theme-border flex items-center justify-center text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 transition">
              <FontAwesomeIcon icon={faFacebook} />
            </a>
          )}
          {serverSettings.socialInstagram && serverSettings.socialInstagramEnabled && (
            <a href={serverSettings.socialInstagram} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border theme-border flex items-center justify-center text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 transition">
              <FontAwesomeIcon icon={faInstagram} />
            </a>
          )}
          {serverSettings.socialTwitter && serverSettings.socialTwitterEnabled && (
            <a href={serverSettings.socialTwitter} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border theme-border flex items-center justify-center text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 transition">
              <FontAwesomeIcon icon={faTwitter} />
            </a>
          )}
          {serverSettings.socialTikTok && serverSettings.socialTikTokEnabled && (
            <a href={serverSettings.socialTikTok} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border theme-border flex items-center justify-center text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 transition">
              <FontAwesomeIcon icon={faTiktok} />
            </a>
          )}
          {serverSettings.socialWhatsApp && serverSettings.socialWhatsAppEnabled && (
            <a href={serverSettings.socialWhatsApp} target="_blank" rel="noreferrer" className="w-9 h-9 rounded-xl bg-[var(--bg-surface)] border theme-border flex items-center justify-center text-[var(--text-secondary)] hover:text-emerald-500 hover:border-emerald-400 transition">
              <FontAwesomeIcon icon={faWhatsapp} />
            </a>
          )}
        </div>

        {/* Admin Login Portal Shortcut */}
        <div className="pt-4 border-t theme-border flex justify-center">
          <Link
            href="/login?callbackUrl=/admin/settings"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-surface)] hover:bg-[var(--bg-card-hover)] border theme-border rounded-xl text-xs font-bold text-[var(--text-secondary)] hover:text-indigo-600 transition shadow-sm"
          >
            <FontAwesomeIcon icon={faLock} className="text-indigo-500 text-xs" />
            <span>{t.adminLogin}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
