'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useCart, useCartStore } from '@/store/useCartStore';
import { useWishlist } from '@/store/useWishlistStore';
import { useSettings, useSettingsStore } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import SearchDropdown from '@/components/SearchDropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShoppingBag,
  faBars,
  faTimes,
  faSearch,
  faUser,
  faShieldHalved,
  faSignOutAlt,
  faBoxes,
  faSun,
  faMoon,
  faGlobe,
  faHeart,
  faBolt,
  faTruckFast,
  faClipboardList,
} from '@fortawesome/free-solid-svg-icons';

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const { getTotalItems: getCartTotal, isMobileMenuOpen } = useCart();
  const { getTotalItems: getWishlistTotal } = useWishlist();
  const { toggleCartDrawer, toggleMobileMenu } = useCartStore();
  const { language, theme, serverSettings } = useSettings();
  const { toggleLanguage, toggleTheme } = useSettingsStore();
  const t = translations[language].nav;
  const cNav = translations[language].commonNav;

  const isAdmin = (session?.user as any)?.role === 'ADMIN' || (session?.user as any)?.role === 'MODERATOR';

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b theme-border shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">

          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => toggleMobileMenu()}
              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] md:hidden focus:outline-none"
              aria-label="Toggle Mobile Menu"
            >
              <FontAwesomeIcon icon={isMobileMenuOpen ? faTimes : faBars} className="text-lg" />
            </button>
            <Link href="/" className="flex items-center gap-2.5 group">
              {serverSettings?.storeLogo ? (
                <div className="h-9 w-9 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 bg-[var(--bg-surface)] border theme-border shadow-sm group-hover:scale-105 transition-transform p-0.5">
                  <img
                    src={serverSettings.storeLogo}
                    alt={serverSettings.storeName || 'Store Logo'}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-extrabold text-base shadow-md group-hover:scale-105 transition-transform flex-shrink-0"
                  style={{
                    backgroundColor: 'var(--accent-color, #6366f1)',
                    boxShadow: '0 4px 14px -2px var(--accent-color, rgba(99, 102, 241, 0.35))',
                  }}
                >
                  {serverSettings?.storeName ? serverSettings.storeName.trim().charAt(0).toUpperCase() : 'S'}
                </div>
              )}
              <span className="text-base sm:text-lg font-black text-[var(--text-primary)] tracking-tight truncate max-w-[180px] sm:max-w-[240px] md:max-w-[300px]">
                {serverSettings?.storeName || 'Store'}
              </span>
            </Link>
          </div>

          {/* Desktop Search Bar with Realtime Dropdown */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <SearchDropdown placeholder={t.searchPlaceholder} />
          </div>

          {/* Nav Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">

            {/* Catalog Link */}
            <Link
              href="/products"
              className="hidden lg:flex items-center gap-1.5 text-xs font-bold text-[var(--text-secondary)] hover:text-indigo-600 px-3 py-2 rounded-xl hover:bg-[var(--bg-surface)] transition"
            >
              <FontAwesomeIcon icon={faBoxes} />
              <span>{t.catalog}</span>
            </Link>

            {/* Deals Link */}
            <Link
              href="/deals"
              className="hidden md:flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 px-2.5 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800/40 transition shadow-sm"
            >
              <FontAwesomeIcon icon={faBolt} className="animate-pulse" />
              <span>{cNav.deals}</span>
            </Link>

            {/* Track Order Link */}
            <Link
              href="/track-order"
              title={cNav.trackOrder}
              className="hidden sm:flex items-center gap-1.5 p-2 text-xs font-semibold text-[var(--text-secondary)] hover:text-indigo-600 rounded-lg hover:bg-[var(--bg-surface)] transition"
            >
              <FontAwesomeIcon icon={faTruckFast} />
              <span className="hidden xl:inline">{cNav.trackOrderShort}</span>
            </Link>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              title={language === 'ar' ? cNav.switchToEn : cNav.switchToAr}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 text-xs font-bold transition shadow-sm"
            >
              <FontAwesomeIcon icon={faGlobe} className="text-indigo-500" />
              <span>{language === 'ar' ? 'English' : 'العربية'}</span>
            </button>

            {/* Theme Light/Dark Mode Switcher */}
            <button
              onClick={toggleTheme}
              title={theme === 'light' ? cNav.darkMode : cNav.lightMode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--bg-primary)] border theme-border text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 text-xs font-bold transition shadow-sm"
            >
              <FontAwesomeIcon icon={theme === 'light' ? faMoon : faSun} className="text-amber-500 text-xs" />
              <span>{theme === 'light' ? cNav.dark : cNav.light}</span>
            </button>

            {/* Wishlist Link */}
            <Link
              href="/wishlist"
              className="relative p-2 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-[var(--bg-surface)] rounded-lg transition"
              aria-label="Open Wishlist"
              title={cNav.wishlist}
            >
              <FontAwesomeIcon icon={faHeart} className="text-lg" />
              {getWishlistTotal() > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                  {getWishlistTotal()}
                </span>
              )}
            </Link>

            {/* Cart Trigger */}
            <button
              onClick={() => toggleCartDrawer(true)}
              className="relative p-2 text-[var(--text-secondary)] hover:text-indigo-600 hover:bg-[var(--bg-surface)] rounded-lg border border-transparent hover:border-[var(--border-color)] transition"
              aria-label="Open Cart"
            >
              <FontAwesomeIcon icon={faShoppingBag} className="text-lg" />
              {getCartTotal() > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[var(--bg-primary)] shadow-sm">
                  {getCartTotal()}
                </span>
              )}
            </button>

            {/* Admin Badge */}
            {isAdmin && (
              <Link
                href="/admin"
                className="hidden sm:flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-700/50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition"
              >
                <FontAwesomeIcon icon={faShieldHalved} />
                <span>{t.admin}</span>
              </Link>
            )}

            {/* Auth Dropdown / Button */}
            {session?.user ? (
              <div className="relative group">
                <button className="flex items-center gap-2 text-sm font-medium text-[var(--text-primary)] hover:text-indigo-600 p-1 rounded-lg transition">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-600 flex items-center justify-center text-indigo-600 dark:text-indigo-300 font-bold text-xs">
                    {session.user.name ? session.user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                </button>
                <div className="absolute end-0 mt-1 w-52 bg-[var(--bg-surface)] border theme-border rounded-2xl shadow-xl py-2 hidden group-hover:block z-50 animate-fadeIn">
                  <div className="px-4 py-2 border-b theme-border">
                    <p className="text-xs font-bold text-[var(--text-primary)] truncate">{session.user.name}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{session.user.email}</p>
                  </div>
                  <Link href="/account" className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition">
                    <FontAwesomeIcon icon={faUser} className="text-indigo-500 text-xs" />
                    <span>{cNav.myAccountAndDashboard}</span>
                  </Link>
                  <Link href="/account/orders" className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition">
                    <FontAwesomeIcon icon={faClipboardList} className="text-emerald-500 text-xs" />
                    <span>{cNav.myOrders}</span>
                  </Link>
                  <Link href="/wishlist" className="flex items-center gap-2 px-4 py-2 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-card)] transition">
                    <FontAwesomeIcon icon={faHeart} className="text-rose-500 text-xs" />
                    <span>{cNav.myWishlist}</span>
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-xs text-indigo-600 font-bold hover:bg-[var(--bg-card)] transition">
                      <FontAwesomeIcon icon={faShieldHalved} />
                      <span>{t.adminDashboard}</span>
                    </Link>
                  )}
                  <div className="pt-1 mt-1 border-t theme-border">
                    <button
                      onClick={() => signOut()}
                      className="w-full text-left px-4 py-2 text-xs text-red-500 hover:bg-[var(--bg-card)] flex items-center gap-2 transition"
                    >
                      <FontAwesomeIcon icon={faSignOutAlt} />
                      <span>{t.signOut}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition shadow-md shadow-indigo-600/20"
              >
                <FontAwesomeIcon icon={faUser} />
                <span className="hidden sm:inline">{t.signIn}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t theme-border space-y-3">
            {/* Mobile Realtime Search */}
            <SearchDropdown
              isMobile
              className="w-full"
              placeholder={t.searchPlaceholderMobile}
              onNavigate={() => toggleMobileMenu(false)}
            />
            <div className="flex flex-col gap-1 text-sm font-medium">
              <Link href="/" onClick={() => toggleMobileMenu(false)} className="px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition">
                {t.home}
              </Link>
              <Link href="/products" onClick={() => toggleMobileMenu(false)} className="px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition">
                {t.allProducts}
              </Link>
              <Link href="/deals" onClick={() => toggleMobileMenu(false)} className="px-3 py-2 rounded-lg text-rose-600 font-bold hover:bg-[var(--bg-card)] transition flex items-center gap-2">
                <FontAwesomeIcon icon={faBolt} />
                <span>{cNav.flashDeals}</span>
              </Link>
              <Link href="/wishlist" onClick={() => toggleMobileMenu(false)} className="px-3 py-2 rounded-lg text-rose-500 hover:bg-[var(--bg-card)] transition flex items-center gap-2">
                <FontAwesomeIcon icon={faHeart} />
                <span>{cNav.wishlist} ({getWishlistTotal()})</span>
              </Link>
              <Link href="/track-order" onClick={() => toggleMobileMenu(false)} className="px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition flex items-center gap-2">
                <FontAwesomeIcon icon={faTruckFast} />
                <span>{cNav.trackOrder}</span>
              </Link>
              {session?.user && (
                <Link href="/account" onClick={() => toggleMobileMenu(false)} className="px-3 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition flex items-center gap-2">
                  <FontAwesomeIcon icon={faUser} />
                  <span>{cNav.myAccount}</span>
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" onClick={() => toggleMobileMenu(false)} className="px-3 py-2 rounded-lg text-indigo-600 font-bold hover:bg-[var(--bg-card)] transition">
                  {t.adminDashboard}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
