import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (!hasPermission(session.user, 'manage_dashboard') && userRole !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to dashboard metrics required' }, { status: 403 });
    }

    const [totalOrders, orders, lowStockProducts, totalProducts, totalUsers] = await Promise.all([
      prisma.order.count(),
      prisma.order.findMany({ select: { totalAmount: true, status: true } }),
      prisma.product.findMany({
        where: { stockQuantity: { lt: 10 } },
        include: { categories: true },
      }),
      prisma.product.count(),
      prisma.user.count(),
    ]);

    const totalRevenue = orders
      .filter((o) => ['DELIVERED', 'COMPLETED'].includes(o.status?.toUpperCase()))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    return NextResponse.json({
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
      totalProducts,
      totalUsers,
    });
  } catch (error) {
    console.error('Error fetching admin metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch admin metrics' }, { status: 500 });
  }
}
