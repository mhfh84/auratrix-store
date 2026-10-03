import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  listServerSnapshots,
  deleteServerSnapshot,
  pruneExpiredBackups,
} from '@/lib/backupService';
import { prisma } from '@/lib/prisma';
import { hasPermission } from '@/lib/permissions';
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// GET: List all server snapshots and prune expired ones
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (!hasPermission(session.user, 'manage_backup') && role !== 'ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized: Access to backups required' }, { status: 403 });
    }

    const settings = await prisma.storeSettings.findUnique({ where: { id: 'default' } });
    const retentionDays = settings?.autoBackupRetentionDays || 7;

    // Prune expired backups older than retentionDays
    const pruneResult = await pruneExpiredBackups(retentionDays);

    const snapshots = await listServerSnapshots(retentionDays);

    return NextResponse.json({
      snapshots,
      retentionDays,
      prunedCount: pruneResult.prunedCount,
    });
  } catch (error: any) {
    console.error('Error listing snapshots:', error);
    return NextResponse.json({ error: error.message || 'Failed to list snapshots' }, { status: 500 });
  }
}

// DELETE: Delete a snapshot file
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json({ error: 'Filename parameter is required' }, { status: 400 });
    }

    const deleted = await deleteServerSnapshot(filename);
    if (!deleted) {
      return NextResponse.json({ error: 'Snapshot not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Snapshot deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting snapshot:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete snapshot' }, { status: 500 });
  }
}

// POST: Download snapshot by name
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const filename = body.filename;

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const safeName = path.basename(filename);
    const filePath = path.join(process.cwd(), 'backups', safeName);

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const buffer = await fsp.readFile(filePath);
    const contentType = safeName.endsWith('.json') ? 'application/json' : 'application/zip';

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Error downloading snapshot:', error);
    return NextResponse.json({ error: error.message || 'Failed to download snapshot' }, { status: 500 });
  }
}
