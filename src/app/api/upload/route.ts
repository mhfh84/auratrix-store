import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Validates binary file signatures (magic bytes) to prevent disguised executable uploads.
 */
function isValidFileSignature(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true;
  }

  // WebP: RIFF (bytes 0-3) and WEBP (bytes 8-11)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }

  // PDF: %PDF- (0x25 0x50 0x44 0x46)
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    // Rate limit: max 5 customer proof uploads per IP per 10 minutes
    const ip = getClientIp(req);
    const rl = checkRateLimit(`upload:${ip}`, { limit: 5, windowMs: 10 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
      }

      // Check max size 8MB
      if (file.size > 8 * 1024 * 1024) {
        return NextResponse.json({ error: 'File size exceeds 8MB limit' }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      // Validate file signature / magic bytes
      if (!isValidFileSignature(buffer)) {
        return NextResponse.json(
          { error: 'Invalid file format. Only legitimate PNG, JPEG, WEBP, and PDF files are allowed.' },
          { status: 400 }
        );
      }

      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });

      const rawExt = path.extname(file.name) || '.jpg';
      const cleanExt = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'].includes(rawExt.toLowerCase()) ? rawExt.toLowerCase() : '.jpg';
      const cleanName = `proof-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${cleanExt}`;
      const filePath = path.join(uploadDir, cleanName);

      await writeFile(filePath, buffer);
      const url = `/uploads/${cleanName}`;

      return NextResponse.json({ url, success: true });
    } else {
      // Base64 JSON fallback
      const body = await req.json();
      const { data, filename } = body;

      if (!data) {
        return NextResponse.json({ error: 'Missing file data' }, { status: 400 });
      }

      const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      if (buffer.length > 8 * 1024 * 1024) {
        return NextResponse.json({ error: 'File size exceeds 8MB limit' }, { status: 400 });
      }

      // Validate file signature / magic bytes
      if (!isValidFileSignature(buffer)) {
        return NextResponse.json(
          { error: 'Invalid file format. Only legitimate PNG, JPEG, WEBP, and PDF files are allowed.' },
          { status: 400 }
        );
      }

      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });

      const rawExt = path.extname(filename || 'proof.jpg') || '.jpg';
      const cleanExt = ['.png', '.jpg', '.jpeg', '.webp'].includes(rawExt.toLowerCase()) ? rawExt.toLowerCase() : '.jpg';
      const cleanName = `proof-${Date.now()}-${Math.random().toString(36).substring(2, 8)}${cleanExt}`;
      const filePath = path.join(uploadDir, cleanName);

      await writeFile(filePath, buffer);
      const url = `/uploads/${cleanName}`;

      return NextResponse.json({ url, success: true });
    }
  } catch (error: any) {
    console.error('Customer proof upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
