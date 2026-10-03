import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

interface CartValidateItem {
  id: string;
  variantId?: string | null;
  quantity: number;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 60 validations per IP per minute (cart opens frequently)
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`cart-validate:${clientIp}`, { limit: 60, windowMs: 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await req.json();
    const { items }: { items: CartValidateItem[] } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ items: [] });
    }

    // Deduplicate product IDs to minimise DB queries
    const productIds = [...new Set(items.map((i) => i.id))];
    const variantIds = [...new Set(items.map((i) => i.variantId).filter(Boolean))] as string[];

    const [products, variants] = await Promise.all([
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          title: true,
          price: true,
          discountPercent: true,
          stockQuantity: true,
        },
      }),
      variantIds.length > 0
        ? (prisma as any).productVariant.findMany({
            where: { id: { in: variantIds } },
            select: { id: true, stockQuantity: true, colorName: true },
          })
        : Promise.resolve([]),
    ]);

    const productMap = new Map<string, any>(products.map((p: any) => [p.id, p]));
    const variantMap = new Map<string, any>(variants.map((v: any) => [v.id, v]));

    const validatedItems = items.map((item) => {
      const product = productMap.get(item.id);

      if (!product) {
        return {
          id: item.id,
          variantId: item.variantId,
          available: false,
          reason: 'not_found',
          currentPrice: 0,
          discountPercent: 0,
          stockQuantity: 0,
        };
      }

      const hasDiscount = Boolean(product.discountPercent && product.discountPercent > 0);
      const currentPrice = hasDiscount
        ? product.price * (1 - product.discountPercent / 100)
        : product.price;

      // Stock check: prefer variant stock if variant is selected
      let availableStock = product.stockQuantity;
      if (item.variantId) {
        const variant = variantMap.get(item.variantId);
        if (!variant) {
          return {
            id: item.id,
            variantId: item.variantId,
            available: false,
            reason: 'variant_not_found',
            currentPrice,
            discountPercent: product.discountPercent,
            stockQuantity: 0,
          };
        }
        availableStock = variant.stockQuantity;
      }

      const enoughStock = availableStock >= item.quantity;

      return {
        id: item.id,
        variantId: item.variantId ?? null,
        available: availableStock > 0,
        enoughStock,
        reason: !enoughStock ? 'insufficient_stock' : undefined,
        currentPrice,
        discountPercent: product.discountPercent,
        stockQuantity: availableStock,
        title: product.title,
      };
    });

    return NextResponse.json({ items: validatedItems });
  } catch (error: any) {
    console.error('Cart validate error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
