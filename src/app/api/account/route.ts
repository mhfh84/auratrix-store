import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { checkRateLimit, getClientIp, rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        loyaltyPoints: true,
        phone: true,
        state: true,
        address: true,
        city: true,
        createdAt: true,
        _count: {
          select: { orders: true, reviews: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    console.error('Account error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 20 profile updates per IP per hour
    const clientIp = getClientIp(req);
    const rl = checkRateLimit(`account-update:${clientIp}`, { limit: 20, windowMs: 60 * 60_000 });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const userId = (session.user as any).id;
    const body = await req.json();
    const { name, phone, state, address, city } = body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name !== undefined ? name : undefined,
        phone: phone !== undefined ? phone : undefined,
        state: state !== undefined ? state : undefined,
        address: address !== undefined ? address : undefined,
        city: city !== undefined ? city : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        state: true,
        address: true,
        city: true,
        loyaltyPoints: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error('Update account error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
