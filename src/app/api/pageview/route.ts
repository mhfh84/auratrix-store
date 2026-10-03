import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { path, referrer } = body;

    if (!path || typeof path !== 'string') {
      return NextResponse.json({ error: 'Path is required' }, { status: 400 });
    }

    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    await prisma.pageView.create({
      data: {
        path: path.slice(0, 255),
        referrer: referrer ? String(referrer).slice(0, 255) : null,
        ip: ip.slice(0, 64),
        userAgent: userAgent.slice(0, 255),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Non-blocking catch
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
