import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultPromoCode } from '@/lib/promoHelper';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Rate limit: max 5 newsletter subscription attempts per IP per 15 minutes
    const ip = getClientIp(request);
    const rl = checkRateLimit(`newsletter:${ip}`, { limit: 5, windowMs: 15 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const email = (body.email || '').trim().toLowerCase();
    const fingerprintId = (body.fingerprintId || '').trim();

    if (!email || !email.includes('@') || !email.includes('.')) {
      return NextResponse.json(
        { success: false, error: 'يرجى إدخال بريد إلكتروني صالح | Please provide a valid email' },
        { status: 400 }
      );
    }

    // Automatically make sure VIP10 promo code exists in database
    await ensureDefaultPromoCode(prisma, 'VIP10');

    // ── Check if this device / IP has already claimed or used VIP10 ──
    const conditions: any[] = [];
    if (ip !== 'unknown') {
      conditions.push({ code: 'VIP10_CLAIM', ip });
      conditions.push({ code: 'VIP10', ip });
    }
    if (fingerprintId) {
      conditions.push({ code: 'VIP10_CLAIM', fingerprintId });
      conditions.push({ code: 'VIP10', fingerprintId });
    }

    let alreadyClaimed = false;
    if (conditions.length > 0) {
      const existingClaim = await prisma.promoCodeIpUsage.findFirst({
        where: { OR: conditions },
      });
      if (existingClaim) {
        alreadyClaimed = true;
      }
    }

    if (alreadyClaimed) {
      return NextResponse.json({
        success: true,
        alreadyClaimed: true,
        couponCode: 'VIP10',
        discountPercent: 10,
        message: 'لقد تم الحصول على كود الخصم مسبقاً لهذا الجهاز (يُسمح بكود واحد لكل عميل) | You have already claimed your 1-time VIP code on this device.',
      });
    }

    // Record the one-time claim for this IP / fingerprint
    if (ip !== 'unknown' || fingerprintId) {
      await prisma.promoCodeIpUsage.create({
        data: {
          code: 'VIP10_CLAIM',
          ip: ip !== 'unknown' ? ip : 'local',
          fingerprintId: fingerprintId || '',
        },
      });
    }

    // Return success response with VIP promo code
    return NextResponse.json({
      success: true,
      alreadyClaimed: false,
      message: 'تم الاشتراك بنجاح في نادي VIP! | Successfully subscribed to VIP Club!',
      couponCode: 'VIP10',
      discountPercent: 10,
    });
  } catch (error: any) {
    console.error('Error handling newsletter subscription:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء معالجة الاشتراك | Subscription failed' },
      { status: 500 }
    );
  }
}
