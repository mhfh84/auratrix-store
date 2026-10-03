export const dynamic = 'force-dynamic';

import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminReviewsClient from './AdminReviewsClient';

export default async function AdminReviewsPage() {
  const reviews = await prisma.review.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      product: { select: { id: true, title: true } },
    },
  });

  const serialized = reviews.map((r) => ({
    id: r.id,
    productId: r.productId,
    productTitle: r.product?.title ?? '—',
    authorName: r.authorName,
    authorEmail: r.authorEmail ?? '',
    rating: r.rating,
    comment: r.comment,
    isVerified: r.isVerified,
    createdAt: r.createdAt.toISOString(),
  }));

  return <AdminReviewsClient reviews={serialized} />;
}
