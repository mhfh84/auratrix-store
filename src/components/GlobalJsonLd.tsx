import React from 'react';
import { prisma } from '@/lib/prisma';

export default async function GlobalJsonLd() {
  let settings = null;
  try {
    settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
    });
  } catch (error) {
    // Fallback if DB is initializing
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const storeName = settings?.storeName || 'Store';
  const logoUrl = settings?.storeLogo || `${siteUrl}/icons/icon-512x512.png`;

  const sameAs: string[] = [];
  if (settings?.socialFacebook && settings.socialFacebookEnabled) sameAs.push(settings.socialFacebook);
  if (settings?.socialInstagram && settings.socialInstagramEnabled) sameAs.push(settings.socialInstagram);
  if (settings?.socialTwitter && settings.socialTwitterEnabled) sameAs.push(settings.socialTwitter);
  if (settings?.socialTikTok && settings.socialTikTokEnabled) sameAs.push(settings.socialTikTok);
  if (settings?.socialWhatsApp && settings.socialWhatsAppEnabled) sameAs.push(settings.socialWhatsApp);

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: storeName,
    url: siteUrl,
    description: `${storeName} Online Store`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${siteUrl}/products?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'OnlineStore',
    name: storeName,
    url: siteUrl,
    logo: logoUrl,
    description: `${storeName} - E-Commerce Store`,
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: settings?.contactPhone || '+20 10 0000 0000',
      email: settings?.contactEmail || '',
      contactType: 'customer support',
      availableLanguage: ['Arabic', 'English'],
    },
    sameAs: sameAs.length > 0 ? sameAs : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
    </>
  );
}
