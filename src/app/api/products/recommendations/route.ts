import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`recommendations:${clientIp}`, { limit: 120, windowMs: 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { searchParams } = new URL(req.url);
    const productId = searchParams.get('productId') || '';
    const categoryIdsParam = searchParams.get('categoryIds') || '';
    const limit = Math.min(12, Math.max(1, parseInt(searchParams.get('limit') || '6', 10)));

    const categoryIds = categoryIdsParam.split(',').map((s) => s.trim()).filter(Boolean);

    let whereCondition: any = {
      id: { not: productId },
    };

    if (categoryIds.length > 0) {
      whereCondition.categories = {
        some: { id: { in: categoryIds } },
      };
    }

    let products = await prisma.product.findMany({
      where: whereCondition,
      include: {
        categories: true,
        variants: true,
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: [
        { averageRating: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    // Fallback: If not enough related category products found, fill with top rated products
    if (products.length < limit) {
      const existingIds = [productId, ...products.map((p) => p.id)];
      const fallbackProducts = await prisma.product.findMany({
        where: {
          id: { notIn: existingIds },
        },
        include: {
          categories: true,
          variants: true,
          reviews: {
            select: { rating: true },
          },
        },
        orderBy: [
          { averageRating: 'desc' },
          { createdAt: 'desc' },
        ],
        take: limit - products.length,
      });

      products = [...products, ...fallbackProducts];
    }

    return NextResponse.json({ products });
  } catch (error: any) {
    console.error('Recommendations error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
