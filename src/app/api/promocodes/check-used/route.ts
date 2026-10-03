import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Extracts the real client IP from Next.js request headers.
 * Supports proxies (X-Forwarded-For) and direct connections.
 */
function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || 'unknown';
}

/**
 * GET /api/promocodes/check-used?code=XXX&fingerprintId=YYY
 *
 * Returns { used: boolean } — true if the current IP OR browser fingerprint
 * has already used this promo code.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim().toUpperCase();
    const fingerprintId = searchParams.get('fingerprintId')?.trim() || '';

    if (!code) {
      return NextResponse.json({ used: false });
    }

    const ip = getClientIp(request);

    // Check if this IP or fingerprintId has already used this code
    const existingByIp = ip !== 'unknown'
      ? await prisma.promoCodeIpUsage.findFirst({
          where: { code, ip },
        })
      : null;

    const existingByFingerprint = fingerprintId
      ? await prisma.promoCodeIpUsage.findFirst({
          where: { code, fingerprintId },
        })
      : null;

    const used = !!(existingByIp || existingByFingerprint);

    return NextResponse.json({ used, code });
  } catch (error: any) {
    console.error('Error checking promo code usage:', error);
    return NextResponse.json({ used: false }, { status: 500 });
  }
}
