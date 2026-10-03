import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  validateBackup,
  restoreBackup,
} from '@/lib/backupService';
import fs from 'fs';
import { promises as fsp } from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized: Administrator role required for restoring data' }, { status: 403 });
    }

    const contentType = req.headers.get('content-type') || '';
    let fileBuffer: Buffer | null = null;
    let filename: string = '';
    let mode: 'replace' | 'merge' = 'replace';
    let autoSnapshot: boolean = true;
    let validateOnly: boolean = false;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      const snapshotFilename = formData.get('snapshotFilename') as string | null;
      mode = (formData.get('mode') as 'replace' | 'merge') || 'replace';
      autoSnapshot = formData.get('autoSnapshot') === 'false' ? false : true;
      validateOnly = formData.get('validateOnly') === 'true';

      if (file) {
        filename = file.name;
        const bytes = await file.arrayBuffer();
        fileBuffer = Buffer.from(bytes);
      } else if (snapshotFilename) {
        const safeName = path.basename(snapshotFilename);
        const snapshotPath = path.join(process.cwd(), 'backups', safeName);
        if (!fs.existsSync(snapshotPath)) {
          return NextResponse.json({ error: 'Snapshot file not found on server' }, { status: 404 });
        }
        filename = safeName;
        fileBuffer = await fsp.readFile(snapshotPath);
      } else {
        return NextResponse.json({ error: 'No backup file or snapshot provided' }, { status: 400 });
      }
    } else {
      // JSON body (for restoring existing server snapshot directly or raw validation)
      const body = await req.json();
      const snapshotFilename = body.snapshotFilename;
      mode = body.mode || 'replace';
      autoSnapshot = body.autoSnapshot !== false;
      validateOnly = Boolean(body.validateOnly);

      if (snapshotFilename) {
        const safeName = path.basename(snapshotFilename);
        const snapshotPath = path.join(process.cwd(), 'backups', safeName);
        if (!fs.existsSync(snapshotPath)) {
          return NextResponse.json({ error: 'Snapshot file not found on server' }, { status: 404 });
        }
        filename = safeName;
        fileBuffer = await fsp.readFile(snapshotPath);
      } else {
        return NextResponse.json({ error: 'No snapshotFilename specified' }, { status: 400 });
      }
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: 'Backup data is empty' }, { status: 400 });
    }

    // 1. Validation / Dry Run
    if (validateOnly) {
      const validation = await validateBackup(fileBuffer, filename);
      // Remove large database object before returning preview
      const { databaseData, ...cleanValidation } = validation;
      return NextResponse.json(cleanValidation);
    }

    // 2. Full Restore Execution
    const result = await restoreBackup(fileBuffer, filename, {
      mode,
      autoSnapshot,
    });

    return NextResponse.json({
      success: true,
      message: 'Restore completed successfully',
      result,
    });
  } catch (error: any) {
    console.error('Restore error:', error);
    return NextResponse.json({ error: error.message || 'Restore failed' }, { status: 500 });
  }
}
