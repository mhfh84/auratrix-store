import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkAndRunScheduledAutoBackup } from '@/lib/backupService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  return handleAutoBackup(req);
}

export async function POST(req: NextRequest) {
  return handleAutoBackup(req);
}

async function handleAutoBackup(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    const isCronAuthorized = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isCronAuthorized) {
      const session = await getServerSession(authOptions);
      const role = (session?.user as any)?.role;
      if (role !== 'ADMIN' && role !== 'MODERATOR') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const result = await checkAndRunScheduledAutoBackup();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Auto backup execution error:', error);
    return NextResponse.json({ error: error.message || 'Auto backup process failed' }, { status: 500 });
  }
}
