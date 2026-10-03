import React from 'react';
import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import CompareClient from './CompareClient';

export const revalidate = 0;

export const metadata: Metadata = {
  title: 'Product Comparison',
  description: 'Compare products side by side to make the best choice.',
};

export default async function ComparePage() {
  // Fetch available products to allow quick search & add to compare on page
  const catalogProducts = await prisma.product.findMany({
    take: 40,
    orderBy: { createdAt: 'desc' },
    include: {
      categories: true,
      variants: true,
    },
  });

  return <CompareClient allCatalogProducts={catalogProducts} />;
}
