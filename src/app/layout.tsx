import './globals.css';
import '@/lib/fontawesome';
import React from 'react';
import type { Metadata, Viewport } from 'next';
import Providers from '@/components/Providers';
import ThemeAndLangWrapper from '@/components/ThemeAndLangWrapper';
import AnnouncementBar from '@/components/AnnouncementBar';
import MaintenanceMode from '@/components/MaintenanceMode';
import StoreShell from '@/components/StoreShell';
import GlobalJsonLd from '@/components/GlobalJsonLd';
import PwaRegister from '@/components/PwaRegister';
import PwaInstallPrompt from '@/components/PwaInstallPrompt';
import GlobalDialog from '@/components/GlobalDialog';

import { prisma } from '@/lib/prisma';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export async function generateMetadata(): Promise<Metadata> {
  let settings = null;
  try {
    settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
    });
  } catch (error) {
    // Fallback if DB is initializing
  }

  const storeName = settings?.storeName || 'Store';
  const logoUrl = settings?.storeLogo || '/icons/icon-512x512.png';
  const ogLocale = settings?.defaultLanguage === 'ar' ? 'ar_SA' : 'en_US';

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: storeName,
      template: `%s | ${storeName}`,
    },
    description: `Official Online Store for ${storeName} - Express Shipping, Exclusive Offers & Secure Payment.`,
    applicationName: storeName,
    authors: [{ name: storeName }],
    generator: 'Next.js',
    keywords: [
      storeName,
      'Store',
      'E-Commerce',
      'Online Shopping',
    ],
    manifest: '/manifest.json',
    icons: {
      icon: settings?.storeLogo
        ? [
            { url: settings.storeLogo },
            { url: '/favicon.ico', sizes: '32x32' },
          ]
        : [
            { url: '/favicon.ico', sizes: '32x32' },
            { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
            { url: '/icons/icon.svg', type: 'image/svg+xml' },
          ],
      apple: settings?.storeLogo
        ? [{ url: settings.storeLogo }]
        : [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
      shortcut: ['/icons/icon-192x192.png'],
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: storeName,
    },
    openGraph: {
      title: storeName,
      description: `Official Online Store for ${storeName}.`,
      url: siteUrl,
      siteName: storeName,
      locale: ogLocale,
      type: 'website',
      images: [
        {
          url: logoUrl,
          width: 512,
          height: 512,
          alt: `${storeName} Logo`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: storeName,
      description: `Official Online Store for ${storeName}.`,
      images: [logoUrl],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // SSR defaults: Arabic RTL, light mode. ThemeAndLangWrapper updates dynamically on client.
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen antialiased" suppressHydrationWarning>
        <GlobalJsonLd />
        <Providers>
          <ThemeAndLangWrapper />
          <AnnouncementBar />
          <MaintenanceMode>
            <StoreShell>
              <main className="flex-grow">{children}</main>
            </StoreShell>
          </MaintenanceMode>
          <PwaRegister />
          <PwaInstallPrompt />
          <GlobalDialog />
        </Providers>
      </body>
    </html>
  );
}
