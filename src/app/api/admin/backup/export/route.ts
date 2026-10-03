import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createBackupArchive,
  createServerSnapshot,
  getSystemBackupStats,
} from '@/lib/backupService';
import { hasPermission } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// GET: Return current system backup metrics & record stats
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (!hasPermission(session.user, 'manage_backup') && role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to backups required' }, { status: 403 });
    }

    const stats = await getSystemBackupStats();
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error('Error getting backup stats:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch backup stats' }, { status: 500 });
  }
}

// POST: Create and download a backup or save snapshot on server
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (!hasPermission(session.user, 'manage_backup') && role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to backup operations required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const scope: 'full' | 'db' | 'media' = body.scope || 'full';
    const saveOnServer: boolean = Boolean(body.saveOnServer);

    if (saveOnServer) {
      const snapshot = await createServerSnapshot(scope, false);
      return NextResponse.json({
        success: true,
        snapshot,
        message: 'Snapshot created and saved successfully on server.',
      });
    }

    const { buffer, filename, manifest } = await createBackupArchive({ scope, isAuto: false });

    const contentType = filename.endsWith('.json') ? 'application/json' : 'application/zip';

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
        'X-Backup-Scope': scope,
        'X-Backup-Records': manifest.totalRecords.toString(),
        'X-Backup-Files': manifest.totalFiles.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error generating backup export:', error);
    return NextResponse.json({ error: error.message || 'Backup generation failed' }, { status: 500 });
  }
}
