import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let settings = null;
  try {
    settings = await prisma.storeSettings.findUnique({
      where: { id: 'default' },
    });
  } catch (error) {
    // Fallback if DB is initializing
  }

  const storeName = settings?.storeName || 'Store';
  const shortName = storeName.split('|')[0].trim() || storeName;

  return {
    name: storeName,
    short_name: shortName,
    description: `${storeName} - Premium Online E-Commerce Platform`,
    start_url: '/',
    display: 'standalone',
    background_color: settings?.lightBgPrimary || '#f8fafc',
    theme_color: settings?.lightAccentColor || '#6366f1',
    shortcuts: [
      {
        name: 'Admin Panel',
        short_name: 'Admin',
        description: 'Manage products & orders',
        url: '/admin',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
    icons: settings?.storeLogo
      ? [
          {
            src: settings.storeLogo,
            sizes: 'any',
            type: 'image/png',
          },
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ]
      : [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
  };
}
