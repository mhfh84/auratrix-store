'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { useSettings, useSettingsStore } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { hasPermission, getPermissionForPath, PermissionId } from '@/lib/permissions';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartBar, faBoxes, faClipboardList, faArrowLeft, faShieldHalved,
  faTag, faUsers, faSliders, faTicket, faGlobe, faSun, faMoon,
  faStar, faRotateLeft, faGift, faDatabase, faBars, faXmark,
  faEllipsisH, faLock,
} from '@fortawesome/free-solid-svg-icons';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { language, theme, serverSettings } = useSettings();
  const { toggleLanguage, toggleTheme, setServerSettings } = useSettingsStore();
  const t = translations[language].adminLayout;
  const tUsers = translations[language].adminUsers;

  // Mobile drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Mobile "More" sheet state
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    const role = (session?.user as any)?.role;
    if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR')) {
      router.push('/login');
    }
  }, [session, status, router]);

  // Close drawer/sheet on route change
  useEffect(() => {
    setDrawerOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-xs text-[var(--text-muted)] animate-pulse">{language === 'ar' ? 'جاري التحقق...' : 'Verifying access...'}</div>
      </div>
    );
  }

  const role = (session?.user as any)?.role;
  if (!session?.user || (role !== 'ADMIN' && role !== 'MODERATOR')) return null;

  const allNavItems: { href: string; label: string; icon: any; key: string; permission: PermissionId }[] = [
    { href: '/admin',              label: t.metrics,                                                                    icon: faChartBar,     key: 'dashboard',   permission: 'manage_dashboard' },
    { href: '/admin/categories',   label: t.categories,                                                                 icon: faTag,          key: 'categories',  permission: 'manage_categories' },
    { href: '/admin/products',     label: t.products,                                                                   icon: faBoxes,        key: 'products',    permission: 'manage_products' },
    { href: '/admin/orders',       label: t.orders,                                                                     icon: faClipboardList,key: 'orders',      permission: 'manage_orders' },
    { href: '/admin/returns',      label: (t as any).returns    || (language === 'ar' ? 'طلبات الإرجاع' : 'Returns'),  icon: faRotateLeft,   key: 'returns',     permission: 'manage_returns' },
    { href: '/admin/users',        label: t.users,                                                                      icon: faUsers,        key: 'users',       permission: 'manage_users' },
    { href: '/admin/promocodes',   label: (t as any).promocodes || 'Promo Codes',                                       icon: faTicket,       key: 'promocodes',  permission: 'manage_promocodes' },
    { href: '/admin/reviews',      label: language === 'ar' ? 'التقييمات' : 'Reviews',                                  icon: faStar,         key: 'reviews',     permission: 'manage_reviews' },
    { href: '/admin/referrals',    label: (t as any).referrals  || (language === 'ar' ? 'برنامج الإحالة' : 'Referrals'),icon: faGift,        key: 'referrals',   permission: 'manage_referrals' },
    { href: '/admin/settings',     label: t.settings,                                                                   icon: faSliders,      key: 'settings',    permission: 'manage_settings' },
    { href: '/admin/backup',       label: (t as any).backup     || (language === 'ar' ? 'النسخ الاحتياطي' : 'Backup'), icon: faDatabase,     key: 'backup',      permission: 'manage_backup' },
  ];

  // Filter accessible nav items based on user role and granular permissions
  const navItems = allNavItems.filter((item) =>
    role === 'ADMIN' || hasPermission(session?.user, item.permission)
  );

  // Check if current route is allowed
  const requiredPerm = getPermissionForPath(pathname);
  const isRouteAllowed = role === 'ADMIN' || (requiredPerm ? hasPermission(session?.user, requiredPerm) : true);

  // Bottom tab bar — primary 4 items
  const bottomPrimary = navItems.slice(0, 4);
  // "More" sheet — remaining items
  const bottomMore = navItems.slice(4);

  const isActive = (href: string) =>
    href === '/admin' ? pathname === '/admin' : pathname.startsWith(href);

  /* ── Shared nav link — used in sidebar & drawer ─────────────────── */
  const NavLink = ({ item, compact = false }: { item: typeof navItems[0]; compact?: boolean }) => {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        title={compact ? item.label : undefined}
        className={`flex items-center gap-2.5 rounded-xl text-xs font-semibold transition-all duration-150
          ${compact ? 'justify-center px-0 py-3' : 'px-3 py-2.5'}
          ${active
            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
          }`}
      >
        <FontAwesomeIcon icon={item.icon} className={compact ? 'text-base' : 'text-sm'} />
        {!compact && <span>{item.label}</span>}
      </Link>
    );
  };

  /* ── Store identity block ────────────────────────────────────────── */
  const StoreIdentity = ({ compact = false }: { compact?: boolean }) => (
    <div className={`flex items-center gap-2.5 pb-4 border-b theme-border mb-2 ${compact ? 'justify-center px-0' : 'px-2'}`}>
      {serverSettings?.storeLogo ? (
        <img src={serverSettings.storeLogo} alt={serverSettings.storeName} className="h-8 w-8 object-contain rounded-md flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-indigo-600/30 flex-shrink-0">
          {serverSettings?.storeName ? serverSettings.storeName.trim().charAt(0).toUpperCase() : 'A'}
        </div>
      )}
      {!compact && (
        <div className="min-w-0 flex-1">
          <p className="text-xs font-extrabold text-[var(--text-primary)] truncate">{serverSettings?.storeName || t.title}</p>
          <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
            <FontAwesomeIcon icon={faShieldHalved} className="text-[9px] text-indigo-500" />
            <span>{role}</span>
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)]">

      {/* ══════════════════════════════════════════════════════════════
          DESKTOP SIDEBAR (>= 1024px) — full width w-56
      ══════════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex fixed inset-y-0 start-0 z-30 w-56 bg-[var(--bg-surface)] border-e theme-border flex-col pt-[4rem] shadow-sm">
        <div className="p-4 space-y-1">
          <StoreIdentity />
          {navItems.map((item) => <NavLink key={item.key} item={item} />)}
        </div>
        <div className="mt-auto p-4 border-t theme-border">
          <Link href="/" className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition font-medium">
            <FontAwesomeIcon icon={faArrowLeft} className={language === 'ar' ? 'rotate-180' : ''} />
            <span>{t.exit}</span>
          </Link>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════
          TABLET SIDEBAR (768px – 1024px) — icon-only w-16
      ══════════════════════════════════════════════════════════════ */}
      <aside className="hidden md:flex lg:hidden fixed inset-y-0 start-0 z-30 w-16 bg-[var(--bg-surface)] border-e theme-border flex-col pt-[4rem] shadow-sm">
        <div className="p-2 space-y-1">
          <StoreIdentity compact />
          {navItems.map((item) => <NavLink key={item.key} item={item} compact />)}
        </div>
        <div className="mt-auto p-3 border-t theme-border flex justify-center">
          <Link href="/" title={t.exit} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition">
            <FontAwesomeIcon icon={faArrowLeft} className={`text-sm ${language === 'ar' ? 'rotate-180' : ''}`} />
          </Link>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE DRAWER OVERLAY (< 768px) — full-screen slide-in
      ══════════════════════════════════════════════════════════════ */}
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setDrawerOpen(false)}
      />
      {/* Drawer panel */}
      <aside
        className={`md:hidden fixed inset-y-0 z-50 w-72 max-w-[85vw] bg-[var(--bg-surface)] shadow-2xl flex flex-col transition-transform duration-300
          ${language === 'ar' ? 'right-0' : 'left-0'}
          ${drawerOpen
            ? 'translate-x-0'
            : language === 'ar' ? 'translate-x-full' : '-translate-x-full'
          }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b theme-border">
          <div className="flex items-center gap-2.5">
            {serverSettings?.storeLogo ? (
              <img src={serverSettings.storeLogo} alt={serverSettings.storeName} className="h-8 w-8 object-contain rounded-md" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-xs shadow-md shadow-indigo-600/30">
                {serverSettings?.storeName ? serverSettings.storeName.trim().charAt(0).toUpperCase() : 'A'}
              </div>
            )}
            <div>
              <p className="text-xs font-extrabold text-[var(--text-primary)] truncate max-w-[160px]">{serverSettings?.storeName || t.title}</p>
              <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                <FontAwesomeIcon icon={faShieldHalved} className="text-[9px] text-indigo-500" />
                <span>{role}</span>
              </p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition"
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        {/* Drawer nav items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-150
                  ${active ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'}`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-4 text-base" />
                <span>{item.label}</span>
                {active && <span className={`ms-auto w-1.5 h-1.5 rounded-full bg-white/70`} />}
              </Link>
            );
          })}
        </div>

        {/* Drawer footer */}
        <div className="p-4 border-t theme-border space-y-2">
          <div className="flex gap-2">
            <button
              onClick={toggleLanguage}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-secondary)] text-xs font-bold transition hover:border-indigo-400"
            >
              <FontAwesomeIcon icon={faGlobe} className="text-indigo-500" />
              <span>{language === 'ar' ? 'English' : 'عربي'}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-secondary)] text-xs font-bold transition hover:border-indigo-400"
            >
              <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} className="text-amber-500" />
              <span>{theme === 'light' ? (language === 'ar' ? 'داكن' : 'Dark') : (language === 'ar' ? 'فاتح' : 'Light')}</span>
            </button>
          </div>
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-secondary)] text-xs font-medium transition hover:text-[var(--text-primary)]"
          >
            <FontAwesomeIcon icon={faArrowLeft} className={language === 'ar' ? 'rotate-180' : ''} />
            <span>{t.exit}</span>
          </Link>
        </div>
      </aside>

      {/* ══════════════════════════════════════════════════════════════
          MAIN CONTENT AREA
      ══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col md:ms-16 lg:ms-56">

        {/* ── Top Bar ──────────────────────────────────────────────── */}
        <div className="sticky top-0 z-20 px-4 md:px-6 py-3 border-b theme-border bg-[var(--bg-surface)] shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 transition"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <FontAwesomeIcon icon={faBars} />
            </button>
            <div>
              <h1 className="text-sm font-extrabold text-[var(--text-primary)]">{t.title}</h1>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 hidden sm:block">{t.subtitle}</p>
            </div>
          </div>

          {/* Top bar controls — desktop / tablet */}
          <div className="hidden md:flex items-center gap-2.5">
            <button
              onClick={toggleLanguage}
              title={language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 text-xs font-bold transition shadow-sm"
            >
              <FontAwesomeIcon icon={faGlobe} className="text-indigo-500" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>
            <button
              onClick={toggleTheme}
              title={theme === 'light' ? (language === 'ar' ? 'الوضع الداكن' : 'Dark Mode') : (language === 'ar' ? 'الوضع الفاتح' : 'Light Mode')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 text-xs font-bold transition shadow-sm"
            >
              <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} className="text-amber-500 text-xs" />
              <span>{theme === 'light' ? (language === 'ar' ? 'داكن' : 'Dark') : (language === 'ar' ? 'فاتح' : 'Light')}</span>
            </button>
          </div>
        </div>

        {/* ── Page Content ─────────────────────────────────────────── */}
        <main className="flex-1 p-4 md:p-6 bg-[var(--bg-primary)] pb-24 md:pb-6">
          {!isRouteAllowed ? (
            <div className="py-16 px-4 max-w-lg mx-auto text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mx-auto flex items-center justify-center text-2xl shadow-sm">
                <FontAwesomeIcon icon={faLock} />
              </div>
              <div>
                <h2 className="text-base font-black text-[var(--text-primary)]">
                  {tUsers.accessRestrictedTitle}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
                  {tUsers.accessRestrictedDesc}
                </p>
              </div>
              {navItems.length > 0 && (
                <div className="pt-2">
                  <Link
                    href={navItems[0].href}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition"
                  >
                    <span>{tUsers.backToAvailable}</span>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE BOTTOM TAB BAR (< 768px)
      ══════════════════════════════════════════════════════════════ */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--bg-surface)] border-t theme-border flex items-stretch shadow-[0_-4px_24px_rgba(0,0,0,0.08)]">
        {bottomPrimary.map((item) => {
          const active = isActive(item.href);
          const shortLabel =
            item.key === 'dashboard'
              ? (language === 'ar' ? 'الرئيسية' : 'Dashboard')
              : item.key === 'products'
              ? (language === 'ar' ? 'المنتجات' : 'Products')
              : item.key === 'orders'
              ? (language === 'ar' ? 'الطلبات' : 'Orders')
              : item.key === 'settings'
              ? (language === 'ar' ? 'الإعدادات' : 'Settings')
              : item.label;

          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors"
            >
              <span className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150 ${active ? 'bg-indigo-600 shadow-md shadow-indigo-600/30' : ''}`}>
                <FontAwesomeIcon
                  icon={item.icon}
                  className={`text-sm transition-colors ${active ? 'text-white' : 'text-[var(--text-muted)]'}`}
                />
              </span>
              <span className={`text-[10px] font-bold truncate max-w-[64px] text-center leading-tight ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-[var(--text-muted)]'}`}>
                {shortLabel}
              </span>
            </Link>
          );
        })}

        {/* More button */}
        <button
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2 transition-colors"
          onClick={() => setMoreOpen(true)}
        >
          <span className="flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150">
            <FontAwesomeIcon icon={faEllipsisH} className="text-sm text-[var(--text-muted)]" />
          </span>
          <span className="text-[10px] font-semibold text-[var(--text-muted)] leading-none">
            {language === 'ar' ? 'المزيد' : 'More'}
          </span>
        </button>
      </nav>

      {/* ══════════════════════════════════════════════════════════════
          MOBILE "MORE" BOTTOM SHEET (< 768px)
      ══════════════════════════════════════════════════════════════ */}
      {/* Backdrop */}
      <div
        className={`md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${moreOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setMoreOpen(false)}
      />
      {/* Sheet */}
      <div
        className={`md:hidden fixed bottom-0 inset-x-0 z-50 bg-[var(--bg-surface)] rounded-t-3xl shadow-2xl transition-transform duration-300 ${moreOpen ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-[var(--text-muted)] opacity-30" />
        </div>
        <div className="px-4 pb-2 flex items-center justify-between">
          <p className="text-xs font-extrabold text-[var(--text-primary)]">
            {language === 'ar' ? 'جميع الأقسام' : 'All Sections'}
          </p>
          <button onClick={() => setMoreOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition">
            <FontAwesomeIcon icon={faXmark} className="text-xs" />
          </button>
        </div>

        {/* Grid of remaining nav items */}
        <div className="px-4 pb-4 grid grid-cols-3 gap-2">
          {bottomMore.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl text-center transition-all duration-150
                  ${active ? 'bg-indigo-600 shadow-md shadow-indigo-600/20' : 'bg-[var(--bg-card)] hover:bg-[var(--bg-primary)]'}`}
              >
                <FontAwesomeIcon icon={item.icon} className={`text-lg ${active ? 'text-white' : 'text-indigo-500'}`} />
                <span className={`text-[11px] font-semibold leading-tight ${active ? 'text-white' : 'text-[var(--text-secondary)]'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Sheet footer */}
        <div className="px-4 pb-safe pb-6 border-t theme-border mt-1 pt-3 flex gap-2">
          <button onClick={toggleLanguage} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-secondary)] text-xs font-bold">
            <FontAwesomeIcon icon={faGlobe} className="text-indigo-500" />
            <span>{language === 'ar' ? 'English' : 'عربي'}</span>
          </button>
          <button onClick={toggleTheme} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-secondary)] text-xs font-bold">
            <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} className="text-amber-500" />
            <span>{theme === 'light' ? (language === 'ar' ? 'داكن' : 'Dark') : (language === 'ar' ? 'فاتح' : 'Light')}</span>
          </button>
          <Link href="/" className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-secondary)] text-xs font-bold">
            <FontAwesomeIcon icon={faArrowLeft} className={language === 'ar' ? 'rotate-180' : ''} />
            <span>{t.exit}</span>
          </Link>
        </div>
      </div>

    </div>
  );
}
