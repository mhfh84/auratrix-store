export const dynamic = 'force-dynamic';

import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminDashboardClient from '@/app/admin/AdminDashboardClient';

export default async function AdminPage() {
  const [allOrders, products, categories] = await Promise.all([
    prisma.order.findMany({
      include: {
        orderItems: {
          include: { product: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.product.findMany({ include: { categories: true } }),
    prisma.category.findMany(),
  ]);

  const lowStockProducts = products.filter((p: { stockQuantity: number }) => p.stockQuantity < 10);

  // Serialize orders (convert Dates to ISO strings) for client component
  const serializedOrders = allOrders.map((o) => ({
    id: o.id,
    totalAmount: o.totalAmount,
    status: o.status,
    createdAt: o.createdAt.toISOString(),
    orderItems: o.orderItems.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      product: {
        title: item.product.title,
        images: item.product.images,
      },
    })),
  }));

  return (
    <AdminDashboardClient
      allOrders={serializedOrders}
      totalProducts={products.length}
      lowStockProducts={lowStockProducts as any}
      totalCategories={categories.length}
    />
  );
}
