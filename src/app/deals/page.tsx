import React from 'react';
import { prisma } from '@/lib/prisma';
import DealsPageClient from './DealsPageClient';

export const dynamic = 'force-dynamic';

export default async function DealsPage() {
  const dealsProducts = await prisma.product.findMany({
    where: {
      discountPercent: {
        gt: 0,
      },
    },
    orderBy: {
      discountPercent: 'desc',
    },
    include: {
      categories: true,
      variants: true,
    },
  });

  return <DealsPageClient initialProducts={dealsProducts} />;
}
