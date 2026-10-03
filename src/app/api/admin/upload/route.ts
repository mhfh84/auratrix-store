import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (role !== 'ADMIN' && role !== 'MODERATOR') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

      // Create uploads directory if not exists
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });

      // Clean filename — whitelist safe extensions only
      const rawExt = path.extname(file.name) || '.jpg';
      const cleanExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(rawExt.toLowerCase()) ? rawExt.toLowerCase() : '.jpg';
      const cleanName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${cleanExt}`;
      const filePath = path.join(uploadDir, cleanName);

      await writeFile(filePath, buffer);
      const url = `/uploads/${cleanName}`;

      return NextResponse.json({ url, success: true });
    } else {
      // Base64 JSON fallback
      const body = await req.json();
      const { data, filename } = body;

      if (!data) {
        return NextResponse.json({ error: 'Missing base64 data' }, { status: 400 });
      }

      const base64Data = data.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Check max size 8MB
      if (buffer.length > 8 * 1024 * 1024) {
        return NextResponse.json({ error: 'File size exceeds 8MB limit' }, { status: 400 });
      }

      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      await mkdir(uploadDir, { recursive: true });

      const rawExt = path.extname(filename || 'image.jpg') || '.jpg';
      const cleanExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(rawExt.toLowerCase()) ? rawExt.toLowerCase() : '.jpg';
      const cleanName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${cleanExt}`;
      const filePath = path.join(uploadDir, cleanName);

      await writeFile(filePath, buffer);
      const url = `/uploads/${cleanName}`;

      return NextResponse.json({ url, success: true });
    }
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Upload failed' }, { status: 500 });
  }
}
