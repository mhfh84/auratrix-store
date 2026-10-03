import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/promocodes/mark-used
 * Body: { code: string; fingerprintId: string }
 *
 * Records that this IP + browser fingerprint has used the given promo code.
 * Safe to call multiple times — uses upsert logic (insert if not exists).
 */
export async function POST(request: Request) {
  try {
    // Rate limit: max 30 mark-used calls per IP per 10 minutes
    const ip = getClientIp(request);
    const rl = checkRateLimit(`promo-mark:${ip}`, { limit: 30, windowMs: 10 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const code = (body.code || '').trim().toUpperCase();
    const fingerprintId = (body.fingerprintId || '').trim();

    if (!code) {
      return NextResponse.json({ error: 'code is required' }, { status: 400 });
    }

    // Check if this combo already exists to avoid duplicate inserts
    const existing = await prisma.promoCodeIpUsage.findFirst({
      where: {
        OR: [
          { code, ip: ip !== 'unknown' ? ip : undefined },
          fingerprintId ? { code, fingerprintId } : {},
        ].filter((c) => Object.keys(c).length > 0),
      },
    });

    if (!existing) {
      await prisma.promoCodeIpUsage.create({
        data: {
          code,
          ip,
          fingerprintId,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking promo code as used:', error);
    return NextResponse.json({ error: 'Failed to mark code as used' }, { status: 500 });
  }
}
