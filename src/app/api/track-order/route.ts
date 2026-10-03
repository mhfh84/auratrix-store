import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Rate limit: max 20 tracking lookups per IP per 10 minutes (prevents brute forcing)
    const ip = getClientIp(req);
    const rl = checkRateLimit(`track-order:${ip}`, { limit: 20, windowMs: 10 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId')?.trim();
    const query = searchParams.get('query')?.trim();

    const rawSearch = (orderId || query || '').trim();
    if (!rawSearch || rawSearch.length < 4) {
      return NextResponse.json(
        { error: 'Please provide a valid Order ID or Tracking Number (at least 4 characters).' },
        { status: 400 }
      );
    }

    const cleanVal = rawSearch.replace(/^#/, '').trim();

    // Exact and prefix/suffix matching for Order ID and Tracking Number
    const orConditions: any[] = [
      { id: cleanVal },
      { id: rawSearch },
      { id: { endsWith: cleanVal.toLowerCase() } },
      { id: { startsWith: cleanVal.toLowerCase() } },
      { trackingNumber: cleanVal },
      { trackingNumber: rawSearch },
    ];

    // Only allow phone match if user provides a full phone number (at least 8 digits)
    const digitsOnly = cleanVal.replace(/\D/g, '');
    if (digitsOnly.length >= 8) {
      orConditions.push({ guestInfo: { contains: digitsOnly } });
    }

    const order = await prisma.order.findFirst({
      where: {
        OR: orConditions,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
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
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error: any) {
    console.error('Track order error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

