'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSettings } from '@/store/useSettingsStore';
import { translations } from '@/lib/translations';
import { useRealtimeSync } from '@/hooks/useRealtimeSync';
import FooterNewsletter from '@/components/FooterNewsletter';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faPhone,
  faShieldHalved,
  faTruckFast,
  faRotateLeft,
  faCircleQuestion,
  faHeadset,
  faFileContract,
  faLock,
  faBuilding,
  faMoneyBillWave,
  faCreditCard,
  faBolt,
  faShoppingBag,
  faFire,
  faUser,
} from '@fortawesome/free-solid-svg-icons';
import {
  faFacebook,
  faInstagram,
  faTwitter,
  faTiktok,
  faWhatsapp,
} from '@fortawesome/free-brands-svg-icons';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  _count?: {
    products?: number;
  };
}

export default function Footer() {
  const { language, serverSettings } = useSettings();
  const t = translations[language].footer;
  const isRTL = language === 'ar';
  const year = new Date().getFullYear();

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch active store categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setCategories(data);
        }
      }
    } catch (err) {
      console.error('Failed to load footer categories:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Realtime updates when categories are added / edited in admin
  useRealtimeSync(
    () => {
      fetchCategories();
    },
    { types: ['categories', 'all'] }
  );

  // Display only parent (top-level) categories
  const parentCategories = categories.filter((c) => !c.parentId);

  return (
    <footer className="bg-[var(--bg-surface)] border-t theme-border text-[var(--text-secondary)] pt-16 pb-8 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* VIP Newsletter Subscription Banner */}
        <FooterNewsletter />

        {/* Main Grid: 5 Columns on Desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-6 pb-12 border-b theme-border">

          {/* 1. Brand & Socials */}
          <div className="space-y-4 lg:col-span-1">
            <div className="flex items-center gap-2">
              {serverSettings?.storeLogo ? (
                <img
                  src={serverSettings.storeLogo}
                  alt={serverSettings.storeName}
                  className="h-8 max-w-[150px] object-contain"
                />
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-md shadow-indigo-600/30">
                    {serverSettings?.storeName ? serverSettings.storeName.trim().charAt(0).toUpperCase() : 'S'}
                  </div>
                  <span className="text-sm font-black text-[var(--text-primary)] tracking-tight">
                    {serverSettings?.storeName || 'Store'}
                  </span>
                </>
              )}
            </div>
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">{t.tagline}</p>

            {/* Social Icons */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              {serverSettings?.socialFacebook && serverSettings?.socialFacebookEnabled && (
                <a
                  href={serverSettings.socialFacebook}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border theme-border flex items-center justify-center text-xs text-[var(--text-secondary)] hover:text-indigo-600 hover:border-indigo-400 transition shadow-sm"
                  aria-label="Facebook"
                >
                  <FontAwesomeIcon icon={faFacebook} />
                </a>
              )}
              {serverSettings?.socialInstagram && serverSettings?.socialInstagramEnabled && (
                <a
                  href={serverSettings.socialInstagram}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border theme-border flex items-center justify-center text-xs text-[var(--text-secondary)] hover:text-pink-600 hover:border-pink-400 transition shadow-sm"
                  aria-label="Instagram"
                >
                  <FontAwesomeIcon icon={faInstagram} />
                </a>
              )}
              {serverSettings?.socialTwitter && serverSettings?.socialTwitterEnabled && (
                <a
                  href={serverSettings.socialTwitter}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border theme-border flex items-center justify-center text-xs text-[var(--text-secondary)] hover:text-sky-500 hover:border-sky-400 transition shadow-sm"
                  aria-label="Twitter"
                >
                  <FontAwesomeIcon icon={faTwitter} />
                </a>
              )}
              {serverSettings?.socialTikTok && serverSettings?.socialTikTokEnabled && (
                <a
                  href={serverSettings.socialTikTok}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border theme-border flex items-center justify-center text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-indigo-400 transition shadow-sm"
                  aria-label="TikTok"
                >
                  <FontAwesomeIcon icon={faTiktok} />
                </a>
              )}
              {serverSettings?.socialWhatsApp && serverSettings?.socialWhatsAppEnabled && (
                <a
                  href={serverSettings.socialWhatsApp}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-[var(--bg-card)] border theme-border flex items-center justify-center text-xs text-[var(--text-secondary)] hover:text-emerald-500 hover:border-emerald-400 transition shadow-sm"
                  aria-label="WhatsApp"
                >
                  <FontAwesomeIcon icon={faWhatsapp} />
                </a>
              )}
            </div>
          </div>

          {/* 2. Shop Categories (Parent Only) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {t.shopCategories}
            </h4>
            {isLoading ? (
              <ul className="space-y-2.5">
                {[1, 2, 3, 4].map((n) => (
                  <li key={n} className="h-3.5 bg-[var(--bg-card)] rounded animate-pulse w-28" />
                ))}
              </ul>
            ) : parentCategories.length > 0 ? (
              <ul className="space-y-2 text-xs">
                {parentCategories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/products?category=${encodeURIComponent(cat.slug)}`}
                      className="hover:text-indigo-600 transition inline-block py-0.5"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="space-y-2 text-xs">
                <li>
                  <Link href="/products" className="hover:text-indigo-600 transition inline-block py-0.5">
                    {t.allProducts}
                  </Link>
                </li>
              </ul>
            )}
          </div>

          {/* 3. Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {t.quickLinks}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/products" className="hover:text-indigo-600 transition inline-flex items-center gap-1.5 py-0.5">
                  <FontAwesomeIcon icon={faShoppingBag} className="text-[10px] text-indigo-500" />
                  <span>{t.allProducts}</span>
                </Link>
              </li>
              <li>
                <Link href="/deals" className="hover:text-rose-500 transition inline-flex items-center gap-1.5 py-0.5 font-medium text-rose-500/90">
                  <FontAwesomeIcon icon={faFire} className="text-[10px] text-rose-500" />
                  <span>{t.dealsAndDiscounts}</span>
                </Link>
              </li>
              <li>
                <Link href="/track-order" className="hover:text-indigo-600 transition inline-flex items-center gap-1.5 py-0.5">
                  <FontAwesomeIcon icon={faTruckFast} className="text-[10px] text-sky-500" />
                  <span>{t.trackOrder}</span>
                </Link>
              </li>
              <li>
                <Link href="/checkout" className="hover:text-indigo-600 transition inline-flex items-center gap-1.5 py-0.5">
                  <FontAwesomeIcon icon={faCreditCard} className="text-[10px] text-emerald-500" />
                  <span>{t.guestCheckout}</span>
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-indigo-600 transition inline-flex items-center gap-1.5 py-0.5">
                  <FontAwesomeIcon icon={faUser} className="text-[10px] text-purple-500" />
                  <span>{t.signIn}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* 4. Customer Care & Trust Pages (High Priority) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {t.customerCare}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/faq" className="hover:text-indigo-600 transition inline-flex items-center gap-1.5 py-0.5">
                  <FontAwesomeIcon icon={faCircleQuestion} className="text-[10px] text-indigo-500" />
                  <span>{t.faq}</span>
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-indigo-600 transition inline-flex items-center gap-1.5 py-0.5">
                  <FontAwesomeIcon icon={faRotateLeft} className="text-[10px] text-emerald-500" />
                  <span>{t.refundPolicy}</span>
                </Link>
              </li>
              <li>
                <Link href="/shipping" className="hover:text-indigo-600 transition inline-flex items-center gap-1.5 py-0.5">
                  <FontAwesomeIcon icon={faTruckFast} className="text-[10px] text-amber-500" />
                  <span>{t.shippingInfo}</span>
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-indigo-600 transition inline-flex items-center gap-1.5 py-0.5">
                  <FontAwesomeIcon icon={faHeadset} className="text-[10px] text-sky-500" />
                  <span>{t.contactUs}</span>
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-indigo-600 transition inline-flex items-center gap-1.5 py-0.5">
                  <FontAwesomeIcon icon={faBuilding} className="text-[10px] text-purple-500" />
                  <span>{t.aboutUs}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* 5. Store Guarantee & Payment Badges */}
          <div className="space-y-3 lg:col-span-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)]">
              {t.guarantee}
            </h4>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {t.guaranteeText}
            </p>

            {/* Direct Contact Links */}
            <div className="pt-1 space-y-1.5 text-xs">
              {serverSettings?.contactEmail && (
                <a
                  href={`mailto:${serverSettings.contactEmail}`}
                  className="flex items-center gap-2 hover:text-indigo-600 transition py-0.5"
                >
                  <FontAwesomeIcon icon={faEnvelope} className="text-indigo-500 text-xs flex-shrink-0" />
                  <span className="truncate">{serverSettings.contactEmail}</span>
                </a>
              )}
              {serverSettings?.contactPhone && (
                <a
                  href={`tel:${serverSettings.contactPhone}`}
                  className="flex items-center gap-2 hover:text-indigo-600 transition py-0.5"
                >
                  <FontAwesomeIcon icon={faPhone} className="text-emerald-500 text-xs flex-shrink-0" />
                  <span>{serverSettings.contactPhone}</span>
                </a>
              )}
            </div>

            {/* Payment Method Badges */}
            <div className="pt-2 border-t theme-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] block mb-2">
                {t.paymentMethodsTitle}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-card)] border theme-border text-[10px] font-semibold text-[var(--text-primary)] shadow-sm">
                  <FontAwesomeIcon icon={faMoneyBillWave} className="text-emerald-500" />
                  <span>{t.cod}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-card)] border theme-border text-[10px] font-semibold text-pink-600 dark:text-pink-400 shadow-sm">
                  <FontAwesomeIcon icon={faBolt} />
                  <span>InstaPay</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-card)] border theme-border text-[10px] font-semibold text-amber-600 dark:text-amber-400 shadow-sm">
                  <span>Fawry</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--bg-card)] border theme-border text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 shadow-sm">
                  <FontAwesomeIcon icon={faCreditCard} />
                  <span>Visa / MC</span>
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Bar: Legal Links, Copyright & Designed by Auratrix */}
        <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[var(--text-muted)]">
          <div className="text-center md:text-start space-y-1">
            <div>
              &copy; {year} {serverSettings?.storeName || 'Store'}. {t.copyright}
            </div>
            {/* Designed by Auratrix attribution badge with official link */}
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)] justify-center md:justify-start">
              <span>{t.designedBy}</span>
              <a
                href="https://auratrix.store"
                target="_blank"
                rel="noopener noreferrer"
                className="font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline transition inline-flex items-center gap-1 group"
                title="Auratrix Official Website"
              >
                <span>{t.auratrixBrand}</span>
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform" />
              </a>
            </div>
          </div>

          {/* Quick Legal Strip */}
          <div className="flex items-center gap-4 flex-wrap justify-center text-[11px]">
            <Link href="/about" className="hover:text-indigo-600 transition">
              {t.aboutUs}
            </Link>
            <span>•</span>
            <Link href="/faq" className="hover:text-indigo-600 transition">
              {t.faq}
            </Link>
            <span>•</span>
            <Link href="/shipping" className="hover:text-indigo-600 transition">
              {t.shippingInfo}
            </Link>
            <span>•</span>
            <Link href="/refund-policy" className="hover:text-indigo-600 transition">
              {t.refundPolicy}
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-indigo-600 transition">
              {t.terms}
            </Link>
            <span>•</span>
            <Link href="/privacy" className="hover:text-indigo-600 transition">
              {t.privacy}
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}


