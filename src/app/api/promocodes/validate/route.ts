import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultPromoCode } from '@/lib/promoHelper';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';


export async function POST(request: Request) {
  try {
    // Rate limit: max 20 promo validation attempts per IP per 10 minutes
    const ip = getClientIp(request);
    const rl = checkRateLimit(`promo-validate:${ip}`, { limit: 20, windowMs: 10 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const { code, cartTotal, fingerprintId } = body;

    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ valid: false, error: 'يرجى إدخال كود الخصم | Please enter a promo code' }, { status: 400 });
    }

    const cleanCode = code.trim().toUpperCase();
    const numericTotal = Number(cartTotal) || 0;
    const clientFingerprintId = (fingerprintId || '').trim();

    let promo = await prisma.promoCode.findUnique({
      where: { code: cleanCode },
    });

    if (!promo) {
      // Check if it's the configured welcome or VIP code and ensure it exists
      const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
      const defaultCode = (settings?.popupDiscountCode || 'WELCOME10').trim().toUpperCase();
      if (cleanCode === defaultCode || cleanCode === 'WELCOME10' || cleanCode === 'VIP10') {
        await ensureDefaultPromoCode(prisma, cleanCode);
        promo = await prisma.promoCode.findUnique({ where: { code: cleanCode } });
      }
    }

    if (!promo) {
      return NextResponse.json({ valid: false, error: 'كود الخصم غير صحيح | Invalid promo code' }, { status: 404 });
    }

    if (!promo.isActive) {
      return NextResponse.json({ valid: false, error: 'كود الخصم غير نشط | Promo code is disabled' }, { status: 400 });
    }

    // Check Expiry Date
    if (promo.expiresAt && new Date(promo.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: 'انتهت صلاحية كود الخصم | Promo code has expired' }, { status: 400 });
    }

    // Check Max Uses Limit (global)
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      return NextResponse.json({ valid: false, error: 'تم استخدام كود الخصم لأقصى عدد مسموح | Promo code usage limit reached' }, { status: 400 });
    }

    // ─── Per-IP + fingerprint check (supports maxUsesPerUser) ──────────────
    const ipConditions: any[] = [];
    if (ip !== 'unknown') {
      ipConditions.push({ code: cleanCode, ip });
    }
    if (clientFingerprintId) {
      ipConditions.push({ code: cleanCode, fingerprintId: clientFingerprintId });
    }

    if (ipConditions.length > 0) {
      const allowedPerUser = promo.maxUsesPerUser ?? 1;
      const userUsageCount = await prisma.promoCodeIpUsage.count({
        where: { OR: ipConditions },
      });

      if (userUsageCount >= allowedPerUser) {
        return NextResponse.json({
          valid: false,
          error:
            allowedPerUser === 1
              ? 'لقد استخدمت هذا الكود من قبل | You have already used this promo code'
              : `لقد استنفدت الحد المسموح لك لاستخدام هذا الكود (${allowedPerUser} مرات) | You have reached your usage limit for this code (${allowedPerUser} uses)`,
        }, { status: 400 });
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    // Check Minimum Order Amount
    if (promo.minOrderAmount > 0 && numericTotal < promo.minOrderAmount) {
      return NextResponse.json({
        valid: false,
        error: `الحد الأدنى للطلب لاستخدام هذا الكود هو ${promo.minOrderAmount} | Minimum order amount for this code is ${promo.minOrderAmount}`,
      }, { status: 400 });
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (promo.discountType === 'PERCENTAGE') {
      discountAmount = (numericTotal * promo.discountValue) / 100;
    } else {
      discountAmount = promo.discountValue;
    }

    // Cap discount at numericTotal
    discountAmount = Math.min(numericTotal, discountAmount);
    discountAmount = Math.round(discountAmount * 100) / 100;

    return NextResponse.json({
      valid: true,
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountAmount,
      minOrderAmount: promo.minOrderAmount,
    });
  } catch (error: any) {
    console.error('Error validating promo code:', error);
    return NextResponse.json({ valid: false, error: 'فشل في التحقق من كود الخصم | Failed to validate promo code' }, { status: 500 });
  }
}
