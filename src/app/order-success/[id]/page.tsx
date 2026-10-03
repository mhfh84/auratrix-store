import React from 'react';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import OrderSuccessClient from './OrderSuccessClient';

export const revalidate = 0;

export default async function OrderSuccessPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          state: true,
          city: true,
          address: true,
        },
      },
      orderItems: { include: { product: true } },
    },
  });

  if (!order) notFound();

  return <OrderSuccessClient order={order as any} />;
}
