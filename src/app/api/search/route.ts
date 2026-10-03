import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`search:${clientIp}`, { limit: 120, windowMs: 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { searchParams } = new URL(req.url);
    const query = (searchParams.get('q') || searchParams.get('query') || searchParams.get('search') || '').trim();
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '8', 10)));

    if (!query) {
      return NextResponse.json({ products: [], categories: [] });
    }

    const [matchedCategories, products] = await Promise.all([
      prisma.category.findMany({
        where: {
          OR: [
            { name: { contains: query } },
            { slug: { contains: query } },
          ],
        },
        take: 3,
      }),
      prisma.product.findMany({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { categories: { some: { name: { contains: query } } } },
            { variants: { some: { colorName: { contains: query } } } },
          ],
        },
        include: {
          categories: true,
          variants: true,
        },
        take: limit * 2,
      }),
    ]);

    // Rank products: Exact title match > Starts with > Contains in title > Others
    const lowerQ = query.toLowerCase();
    const ranked = [...products].sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();

      if (aTitle === lowerQ && bTitle !== lowerQ) return -1;
      if (bTitle === lowerQ && aTitle !== lowerQ) return 1;

      if (aTitle.startsWith(lowerQ) && !bTitle.startsWith(lowerQ)) return -1;
      if (bTitle.startsWith(lowerQ) && !aTitle.startsWith(lowerQ)) return 1;

      return (b.averageRating || 0) - (a.averageRating || 0);
    }).slice(0, limit);

    return NextResponse.json({
      products: ranked,
      categories: matchedCategories,
    });
  } catch (error: any) {
    console.error('Search API error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
