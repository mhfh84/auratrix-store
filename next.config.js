/** @type {import('next').NextConfig} */
const nextConfig = {
  // ─── Standalone Output ────────────────────────────────────────────────────
  // Produces a minimal self-contained build with only the files needed to run.
  // Reduces deployed size from ~500MB to ~50MB, which means far less RAM used
  // when Node.js loads the process on Hostinger.
  output: 'standalone',

  // ─── Security & Headers ───────────────────────────────────────────────────
  poweredByHeader: false, // Don't leak "X-Powered-By: Next.js"
  compress: true,         // Gzip responses — saves bandwidth & cuts parse time

  // ─── Image Optimization ───────────────────────────────────────────────────
  images: {
    // Only allow-list the external domains we actually use
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
    ],
    // Limit parallel sharp workers to 1 to keep RAM usage low on a VPS
    // (default is 4, which can spike to 400+ MB during image processing)
    minimumCacheTTL: 60 * 60 * 24 * 7, // Cache optimized images for 7 days
    formats: ['image/webp'],            // Only generate WebP (skip AVIF — CPU-heavy)
    deviceSizes: [640, 750, 828, 1080, 1200], // Skip 4K sizes we don't need
    imageSizes: [16, 32, 64, 96, 128, 256],
  },

  // ─── Experimental: reduce JS bundle size ─────────────────────────────────
  experimental: {
    // Only bundle server-side packages that are actually imported
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
    // Optimize package imports so only the used icons are bundled
    optimizePackageImports: [
      '@fortawesome/free-solid-svg-icons',
      '@fortawesome/free-brands-svg-icons',
      'recharts',
    ],
  },

  // ─── Webpack Path Aliases ────────────────────────────────────────────────
  webpack: (config) => {
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      '@': require('path').resolve(__dirname, 'src'),
    };
    return config;
  },

  // ─── HTTP Security & Cache Headers ───────────────────────────────────────
  async headers() {
    return [
      // Global Security Headers for all routes
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      // Static files — immutable, browser caches forever
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      // Public uploads (product images, payment proofs)
      {
        source: '/uploads/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=604800, stale-while-revalidate=86400' },
        ],
      },
      // Public icons & manifest
      {
        source: '/icons/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400' },
        ],
      },
      // Categories API — rarely changes, cache 2 minutes
      {
        source: '/api/categories',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=120, stale-while-revalidate=600' },
        ],
      },
      // Products list — cache 30 s
      {
        source: '/api/products',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=30, stale-while-revalidate=120' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
