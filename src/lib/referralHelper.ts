/**
 * referralHelper.ts
 * Utilities for generating and resolving referral codes and processing rewards.
 */

import { PrismaClient } from '@/generated/client';

/**
 * Generate a unique 8-character referral code like AUR-XXXXXX
 * based on a mix of user ID and random chars.
 */
export function generateReferralCode(userId: string): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoids O/0/I/1 confusion
  const base = userId.replace(/-/g, '').toUpperCase().slice(0, 3);
  let rand = '';
  for (let i = 0; i < 5; i++) {
    rand += chars[Math.floor(Math.random() * chars.length)];
  }
  return `AUR-${base}${rand}`.slice(0, 11);
}

/**
 * Ensure a user has a referral code. If they don't, generate and save one.
 */
export async function ensureUserReferralCode(prisma: any, userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });

  if (user?.referralCode) return user.referralCode;

  // Generate a unique code
  let code = generateReferralCode(userId);
  let attempts = 0;
  while (attempts < 10) {
    const exists = await prisma.user.findFirst({ where: { referralCode: code } });
    if (!exists) break;
    code = generateReferralCode(userId + attempts);
    attempts++;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { referralCode: code },
  });

  return code;
}

/**
 * Resolve referral code to referrer user ID.
 */
export async function resolveReferralCode(prisma: any, code: string): Promise<string | null> {
  if (!code?.trim()) return null;
  const user = await prisma.user.findFirst({
    where: { referralCode: code.trim().toUpperCase() },
    select: { id: true },
  });
  return user?.id || null;
}

/**
 * Create a ReferralRecord linking referrer to referred user, if:
 * - referralCode is valid
 * - referred user hasn't been linked to another referrer
 * - referred user is different from referrer
 *
 * Returns the discount percentage to apply to the referred user's order (0 if not applicable).
 */
export async function processReferralAtRegistration(
  prisma: any,
  referredUserId: string,
  referralCode: string
): Promise<{ discountPercent: number; referrerId: string | null }> {
  try {
    const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    if (!settings?.referralEnabled) return { discountPercent: 0, referrerId: null };

    const referrerId = await resolveReferralCode(prisma, referralCode);
    if (!referrerId || referrerId === referredUserId) return { discountPercent: 0, referrerId: null };

    // Check if referred user already has a referral record
    const existing = await prisma.referralRecord.findFirst({ where: { referredUserId } });
    if (existing) return { discountPercent: 0, referrerId: null };

    // Link the referral
    await prisma.user.update({
      where: { id: referredUserId },
      data: { referredById: referrerId },
    });

    await prisma.referralRecord.create({
      data: {
        referrerId,
        referredUserId,
        status: 'PENDING',
        discountGiven: settings.referralRefereeDiscount || 10.0,
      },
    });

    return {
      discountPercent: settings.referralRefereeDiscount || 10.0,
      referrerId,
    };
  } catch (error) {
    console.error('Referral registration error:', error);
    return { discountPercent: 0, referrerId: null };
  }
}

/**
 * Award referrer points when referred user completes their first order.
 * Marks the ReferralRecord as REWARDED.
 */
export async function awardReferrerOnFirstOrder(
  prisma: any,
  referredUserId: string,
  orderId: string
): Promise<void> {
  try {
    const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    if (!settings?.referralEnabled) return;

    const record = await prisma.referralRecord.findFirst({
      where: { referredUserId, status: 'PENDING' },
    });

    if (!record) return;

    const rewardPoints = settings.referralReferrerPoints || 50;

    // Award points to referrer
    await prisma.user.update({
      where: { id: record.referrerId },
      data: { loyaltyPoints: { increment: rewardPoints } },
    });

    // Update record to REWARDED
    await prisma.referralRecord.update({
      where: { id: record.id },
      data: {
        status: 'REWARDED',
        orderId,
        rewardPoints,
      },
    });
  } catch (error) {
    console.error('Referrer reward error:', error);
  }
}
