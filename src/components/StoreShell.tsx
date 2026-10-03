'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import Footer from '@/components/Footer';
import PromoPopup from '@/components/PromoPopup';
import FloatingWhatsApp from '@/components/FloatingWhatsApp';
import FloatingCompareBar from '@/components/FloatingCompareBar';
import AbandonedCartToast from '@/components/AbandonedCartToast';
import ToastNotifications from '@/components/ToastNotifications';
import { useUserStoreSync } from '@/hooks/useUserStoreSync';

/**
 * Renders the storefront chrome (Navbar, CartDrawer, Footer, PromoPopup,
 * FloatingWhatsApp, FloatingCompareBar) only on non-admin routes.
 * ToastNotifications is mounted globally for all routes.
 */
export default function StoreShell({ children }: { children: React.ReactNode }) {
  useUserStoreSync(); // Clear cart/wishlist when user logs out or switches accounts
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  // Track pageview on navigation
  useEffect(() => {
    if (!isAdmin && pathname) {
      try {
        fetch('/api/pageview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: pathname,
            referrer: typeof document !== 'undefined' ? document.referrer : '',
          }),
        }).catch(() => {});
      } catch (e) {}
    }
  }, [pathname, isAdmin]);

  if (isAdmin) {
    return (
      <>
        {children}
        <ToastNotifications />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <CartDrawer />
      <PromoPopup />
      {children}
      <FloatingWhatsApp />
      <FloatingCompareBar />
      <AbandonedCartToast />
      <Footer />
      <ToastNotifications />
    </>
  );
}

