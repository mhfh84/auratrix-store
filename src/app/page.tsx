import React from 'react';
import { prisma } from '@/lib/prisma';
import HomePageClient from './HomePageClient';

// ISR: re-render at most once every 60 seconds.
// During that window all visitors share one cached HTML — zero extra DB queries.
export const revalidate = 60;

export default async function HomePage() {
  const [categories, newArrivals, bestSellerData, allCatalogProducts] = await Promise.all([
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: { products: true, children: true },
        },
      },
    }),
    prisma.product.findMany({
      take: 24,
      orderBy: { createdAt: 'desc' },
      include: { categories: { include: { parent: true } } },
    }),
    prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    }),
    prisma.product.findMany({
      where: { stockQuantity: { gt: 0 } },
      take: 30,
      orderBy: { updatedAt: 'desc' },
      include: { categories: { include: { parent: true } } },
    }),
  ]);

  // Build best sellers list, preserving rank order
  let bestSellers: any[] = [];
  if (bestSellerData.length > 0) {
    const bestSellerIds = bestSellerData.map((b) => b.productId);
    const bestSellersRaw = await prisma.product.findMany({
      where: { id: { in: bestSellerIds } },
      include: { categories: { include: { parent: true } } },
    });
    bestSellers = bestSellerIds
      .map((id) => bestSellersRaw.find((p) => p.id === id))
      .filter(Boolean) as any[];
  }

  // Ensure exactly 8 best sellers by filling from newArrivals or allCatalogProducts
  const existingBestSellerIds = new Set(bestSellers.map((p) => p.id));
  const fallbackPool = [...newArrivals, ...allCatalogProducts];
  for (const candidate of fallbackPool) {
    if (bestSellers.length >= 8) break;
    if (!existingBestSellerIds.has(candidate.id)) {
      bestSellers.push(candidate);
      existingBestSellerIds.add(candidate.id);
    }
  }

  // Combine product pool for dynamic hero selection
  const heroPool = allCatalogProducts.length >= 4 ? allCatalogProducts : newArrivals;

  return (
    <HomePageClient
      categories={categories}
      newArrivals={newArrivals}
      bestSellers={bestSellers.slice(0, 8)}
      heroPool={heroPool}
    />
  );
}
