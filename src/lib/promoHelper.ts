import { PrismaClient } from '@/generated/client';

/**
 * Ensures the welcome/default promo code exists in the database.
 * If not present, creates it with 10% discount and unlimited total redemptions.
 */
export async function ensureDefaultPromoCode(prisma: PrismaClient, targetCode: string = 'VIP10') {
  try {
    const cleanCode = (targetCode || 'VIP10').trim().toUpperCase();
    const existing = await prisma.promoCode.findUnique({
      where: { code: cleanCode },
    });

    if (!existing) {
      await prisma.promoCode.create({
        data: {
          code: cleanCode,
          discountType: 'PERCENTAGE',
          discountValue: 10,
          description: cleanCode === 'VIP10'
            ? '👑 كود خصم نادي كبار العملاء VIP (خصم 10%) | VIP Club 10% OFF discount code'
            : '🎉 كود خصم الترحيب للزوار الجدد (10% خصم) | Welcome discount for new visitors (10% OFF)',
          minOrderAmount: 0,
          maxUses: null,
          usedCount: 0,
          isActive: true,
          expiresAt: null,
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring default promo code:', error);
  }
}
