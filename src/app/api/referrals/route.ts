import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureUserReferralCode } from '@/lib/referralHelper';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referrals
 * - User: returns their code, link, stats, and friends list
 * - Admin: returns overall stats and all referral records
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const isAdmin = userRole === 'ADMIN' || hasPermission(session.user, 'manage_referrals');

    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view'); // 'admin' for admin stats

    if (isAdmin && view === 'admin') {
      // Admin: overall referral stats
      const [totalRecords, rewarded, pending, converted] = await Promise.all([
        (prisma as any).referralRecord.count(),
        (prisma as any).referralRecord.count({ where: { status: 'REWARDED' } }),
        (prisma as any).referralRecord.count({ where: { status: 'PENDING' } }),
        (prisma as any).referralRecord.count({ where: { status: 'CONVERTED' } }),
      ]);

      const allRecords = await (prisma as any).referralRecord.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: {
          referrer: { select: { id: true, name: true, email: true, loyaltyPoints: true } },
          referredUser: { select: { id: true, name: true, email: true, createdAt: true } },
        },
      });

      // Points distributed
      const totalPoints = allRecords
        .filter((r: any) => r.status === 'REWARDED')
        .reduce((s: number, r: any) => s + (r.rewardPoints || 0), 0);

      // Top referrers
      const referrerMap = new Map<string, { name: string; email: string; count: number; points: number }>();
      for (const r of allRecords) {
        if (r.status === 'REWARDED') {
          const existing = referrerMap.get(r.referrerId);
          if (existing) {
            existing.count++;
            existing.points += r.rewardPoints || 0;
          } else {
            referrerMap.set(r.referrerId, {
              name: r.referrer?.name || 'Unknown',
              email: r.referrer?.email || '',
              count: 1,
              points: r.rewardPoints || 0,
            });
          }
        }
      }
      const topReferrers = Array.from(referrerMap.entries())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return NextResponse.json({
        stats: { totalRecords, rewarded, pending, converted, totalPoints },
        topReferrers,
        records: allRecords,
      });
    }

    // User: get their own referral data
    const referralCode = await ensureUserReferralCode(prisma as any, userId);
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://auratrix.store';
    const referralLink = `${baseUrl}/register?ref=${referralCode}`;

    // My referral records
    const myRecords = await (prisma as any).referralRecord.findMany({
      where: { referrerId: userId },
      orderBy: { createdAt: 'desc' },
      include: {
        referredUser: { select: { id: true, name: true, email: true, createdAt: true } },
      },
    });

    const totalReferred = myRecords.length;
    const totalConverted = myRecords.filter((r: any) => r.status === 'REWARDED').length;
    const totalPointsEarned = myRecords.reduce((s: number, r: any) => s + (r.rewardPoints || 0), 0);

    // Check if this user was referred by someone
    const myReferral = await (prisma as any).referralRecord.findUnique({
      where: { referredUserId: userId },
      include: { referrer: { select: { name: true } } },
    });

    return NextResponse.json({
      referralCode,
      referralLink,
      totalReferred,
      totalConverted,
      totalPointsEarned,
      referredBy: myReferral?.referrer?.name || null,
      friends: myRecords,
    });
  } catch (error: any) {
    console.error('Referrals GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch referral data' }, { status: 500 });
  }
}
