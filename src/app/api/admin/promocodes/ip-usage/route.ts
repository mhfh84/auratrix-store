import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/promocodes/ip-usage?code=XXX
 *
 * Returns all IP + fingerprint usage records for a given promo code.
 * Admin only.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || (userRole !== 'ADMIN' && userRole !== 'MODERATOR')) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim().toUpperCase();

    const whereClause = code ? { code } : {};

    const usageRecords = await prisma.promoCodeIpUsage.findMany({
      where: whereClause,
      orderBy: { usedAt: 'desc' },
    });

    // Group by code for summary
    const summary: Record<string, { count: number; records: any[] }> = {};
    for (const record of usageRecords) {
      if (!summary[record.code]) {
        summary[record.code] = { count: 0, records: [] };
      }
      summary[record.code].count++;
      summary[record.code].records.push({
        id: record.id,
        ip: record.ip,
        fingerprintId: record.fingerprintId,
        usedAt: record.usedAt,
      });
    }

    return NextResponse.json({
      records: usageRecords,
      summary,
      total: usageRecords.length,
    });
  } catch (error: any) {
    console.error('Error fetching IP usage:', error);
    return NextResponse.json({ error: 'Failed to fetch IP usage data' }, { status: 500 });
  }
}
