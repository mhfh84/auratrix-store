import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`account-orders:${clientIp}`, { limit: 60, windowMs: 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const userId = (session.user as any).id;
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const fetchAll = searchParams.get('all') === 'true';

    const [total, orders] = await Promise.all([
      prisma.order.count({ where: { userId } }),
      prisma.order.findMany({
        where: { userId },
        include: {
          orderItems: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  images: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        ...(fetchAll ? {} : { skip: (page - 1) * limit, take: limit }),
      }),
    ]);

    return NextResponse.json({
      orders,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    });
  } catch (error: any) {
    console.error('Account orders error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
