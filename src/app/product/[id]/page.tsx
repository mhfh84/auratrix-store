import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductUrl } from '@/lib/productUrl';
import ProductDetailClient from './ProductDetailClient';

export const revalidate = 0;

interface Props {
  params: { id: string };
}

async function findProduct(param: string) {
  let decoded = param;
  try {
    decoded = decodeURIComponent(param).trim();
  } catch (e) {
    decoded = param.trim();
  }

  const includeRelations = {
    categories: {
      include: { parent: true },
    },
    variants: {
      orderBy: { createdAt: 'asc' as const },
    },
    reviews: {
      orderBy: { createdAt: 'desc' as const },
    },
  };

  // 1. Direct query by ID or exact Title
  let product = await prisma.product.findFirst({
    where: {
      OR: [
        { id: decoded },
        { id: param },
        { title: decoded },
        { title: param },
      ],
    },
    include: includeRelations,
  });

  if (product) return product;

  // 2. Normalized slug / fuzzy match across all products
  const allProducts = await prisma.product.findMany({
    include: includeRelations,
  });

  const normalize = (str: string) =>
    str
      .toLowerCase()
      .trim()
      .replace(/[\s\-_+]+/g, '');

  const normDecoded = normalize(decoded);
  const normParam = normalize(param);

  const matched = allProducts.find((p) => {
    const pTitleNorm = normalize(p.title);
    const pIdNorm = normalize(p.id);
    return (
      pTitleNorm === normDecoded ||
      pTitleNorm === normParam ||
      pIdNorm === normDecoded ||
      pIdNorm === normParam ||
      p.title.toLowerCase().trim() === decoded.toLowerCase().trim() ||
      p.id.toLowerCase().trim() === decoded.toLowerCase().trim()
    );
  });

  return matched || null;
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  const [product, settings] = await Promise.all([
    findProduct(params.id),
    prisma.storeSettings.findUnique({ where: { id: 'default' } }).catch(() => null),
  ]);

  const storeName = settings?.storeName || 'Store';

  if (!product) {
    return {
      title: `Product Not Found - ${storeName}`,
    };
  }

  let imagesArray: string[] = [];
  try {
    imagesArray = JSON.parse(product.images);
  } catch (e) {
    imagesArray = [];
  }

  const primaryImage = imagesArray[0] || settings?.storeLogo || '/icons/icon-512x512.png';
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const finalPrice = product.discountPercent > 0 
    ? product.price * (1 - product.discountPercent / 100) 
    : product.price;

  const canonicalUrl = `${siteUrl}${getProductUrl(product)}`;

  return {
    title: `${product.title} | ${storeName}`,
    description: product.description.slice(0, 160),
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${product.title} - ${storeName}`,
      description: product.description.slice(0, 160),
      url: canonicalUrl,
      siteName: storeName,
      images: [
        {
          url: primaryImage,
          width: 800,
          height: 800,
          alt: product.title,
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.title} - ${storeName}`,
      description: product.description.slice(0, 160),
      images: [primaryImage],
    },
    other: {
      'product:price:amount': finalPrice.toFixed(2),
      'product:price:currency': settings?.defaultCurrency || 'USD',
      'product:availability': product.stockQuantity > 0 ? 'in stock' : 'out of stock',
    },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const [product, settings] = await Promise.all([
    findProduct(params.id),
    prisma.storeSettings.findUnique({ where: { id: 'default' } }).catch(() => null),
  ]);

  if (!product) {
    notFound();
  }

  const storeName = settings?.storeName || 'Store';

  // Fetch related products sharing any of the same categories
  const categoryIds = product.categories.map((c) => c.id);
  const relatedProducts = await prisma.product.findMany({
    where: {
      categories: categoryIds.length > 0 ? { some: { id: { in: categoryIds } } } : undefined,
      id: { not: product.id },
    },
    take: 3,
    include: {
      categories: {
        include: { parent: true },
      },
      variants: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  // Parse images
  let imagesArray: string[] = [];
  try {
    imagesArray = JSON.parse(product.images);
  } catch (e) {
    imagesArray = [];
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const finalPrice = product.discountPercent > 0 
    ? product.price * (1 - product.discountPercent / 100) 
    : product.price;

  const categoryName = product.categories[0]?.name || 'General';

  // Schema.org Product Structured Data (Google Rich Snippets)
  const productJsonLd = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.title,
    image: imagesArray.length > 0 ? imagesArray : [`${siteUrl}/icons/icon-512x512.png`],
    description: product.description,
    sku: product.id,
    mpn: product.id,
    brand: {
      '@type': 'Brand',
      name: storeName,
    },
    category: categoryName,
    offers: {
      '@type': 'Offer',
      url: `${siteUrl}${getProductUrl(product)}`,
      priceCurrency: settings?.defaultCurrency || 'USD',
      price: finalPrice.toFixed(2),
      priceValidUntil: '2028-12-31',
      itemCondition: 'https://schema.org/NewCondition',
      availability: product.stockQuantity > 0 
        ? 'https://schema.org/InStock' 
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: storeName,
      },
    },
    ...(product.ratingCount > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: product.averageRating.toFixed(1),
            reviewCount: product.ratingCount.toString(),
            bestRating: '5',
            worstRating: '1',
          },
        }
      : {}),
    ...(product.reviews.length > 0
      ? {
          review: product.reviews.slice(0, 10).map((r) => ({
            '@type': 'Review',
            reviewRating: {
              '@type': 'Rating',
              ratingValue: r.rating.toString(),
              bestRating: '5',
              worstRating: '1',
            },
            author: {
              '@type': 'Person',
              name: r.authorName,
            },
            datePublished: r.createdAt.toISOString().split('T')[0],
            reviewBody: r.comment,
          })),
        }
      : {}),
  };

  // Schema.org BreadcrumbList Structured Data
  const breadcrumbsJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: categoryName,
        item: `${siteUrl}/products?category=${product.categories[0]?.slug || ''}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: product.title,
        item: `${siteUrl}${getProductUrl(product)}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbsJsonLd) }}
      />
      <ProductDetailClient product={product} relatedProducts={relatedProducts} />
    </>
  );
}
